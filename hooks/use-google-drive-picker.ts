"use client";

import { useCallback, useRef, useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY!;
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID!;

const SCOPES = "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file";

import { toast } from "sonner";

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    url: string;
    iconUrl: string;
    lastEditedUtc: number;
}

export interface PickerOptions {
    mimeTypes?: string[];
    multiSelect?: boolean;
    title?: string;
    externalAccessToken?: string; // Skip OAuth flow when provided (server-side token)
}

/**
 * Hook to open a Google Drive Picker and return selected files.
 * Loads `gapi` + `google.accounts.oauth2` scripts on demand (once).
 */
export function useGoogleDrivePicker() {
    const [isLoading, setIsLoading] = useState(false);
    const tokenClientRef = useRef<google.accounts.oauth2.TokenClient | null>(null);
    const accessTokenRef = useRef<string | null>(null);
    const pickerInitedRef = useRef(false);
    const gisInitedRef = useRef(false);

    // --- Script loaders ---
    const loadScript = useCallback((src: string, id: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (document.getElementById(id)) {
                resolve();
                return;
            }
            const script = document.createElement("script");
            script.id = id;
            script.src = src;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }, []);

    const initGapi = useCallback(async () => {
        await loadScript("https://apis.google.com/js/api.js", "gapi-script");
        await new Promise<void>((resolve) => {
            gapi.load("picker", () => {
                pickerInitedRef.current = true;
                resolve();
            });
        });
    }, [loadScript]);

    const initGis = useCallback(async () => {
        await loadScript("https://accounts.google.com/gsi/client", "gis-script");
        gisInitedRef.current = true;
    }, [loadScript]);

    // --- Main open function ---
    const openPicker = useCallback((options?: PickerOptions): Promise<DriveFile[]> => {
        return new Promise(async (resolve, reject) => {
            setIsLoading(true);

            try {
                // Load scripts if needed
                if (!pickerInitedRef.current) await initGapi();

                // If caller provides a server-side token, skip OAuth entirely
                if (options?.externalAccessToken) {
                    showPicker(options.externalAccessToken, resolve, options);
                    return;
                }

                if (!gisInitedRef.current) await initGis();

                // Create the token client (handles OAuth consent)
                if (!tokenClientRef.current) {
                    console.log("Initializing GIS token client...");
                    tokenClientRef.current = google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: SCOPES,
                        callback: () => { }, // will be overridden below
                        error_callback: (error) => {
                            console.error("GIS Error callback:", error);
                            setIsLoading(false);
                            if (error?.type === 'popup_closed') {
                                console.log("GIS Popup closed by user");
                                resolve([]);
                            } else {
                                reject(new Error(error?.type || "Autenticación fallida"));
                            }
                        }
                    });
                }

                // Override callback for this invocation
                tokenClientRef.current.callback = (tokenResponse: google.accounts.oauth2.TokenResponse) => {
                    console.log("GIS Token response received:", tokenResponse.error ? "ERROR" : "SUCCESS");
                    if (tokenResponse.error) {
                        setIsLoading(false);
                        reject(new Error(tokenResponse.error));
                        return;
                    }
                    accessTokenRef.current = tokenResponse.access_token;
                    showPicker(tokenResponse.access_token, resolve, options);
                };

                // If we already have a token, try to reuse it
                if (accessTokenRef.current) {
                    console.log("Reusing existing access token");
                    showPicker(accessTokenRef.current, resolve, options);
                } else {
                    console.log("Requesting new access token via GIS...");
                    // Try to get token without forcing consent screen if possible
                    tokenClientRef.current.requestAccessToken();
                }
            } catch (err) {
                setIsLoading(false);
                reject(err);
            }
        });
    }, [initGapi, initGis]);

    const showPicker = useCallback(
        (token: string, onDone: (files: DriveFile[]) => void, options?: PickerOptions) => {
            try {
                const createDocsView = (label: string, ownedByMe: boolean) => {
                    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
                        .setIncludeFolders(true)
                        .setOwnedByMe(ownedByMe)
                        .setLabel(label);
                    
                    // Note: Setting setMimeTypes often causes folders to appear empty if they don't contain 
                    // matching files directly. To allow full navigation like the "Insignias" modal,
                    // we'll avoid restrictive view filters when folders are enabled.
                    // We'll handle the selection restriction in the callback instead.
                    
                    return view;
                };

                const myDriveView = createDocsView("Mi unidad", true);
                const sharedView = createDocsView("Compartidos conmigo", false);
                const recentView = new google.picker.DocsView(google.picker.ViewId.RECENTLY_PICKED)
                    .setLabel("Recientes");
                if (options?.mimeTypes?.length) {
                    recentView.setMimeTypes(options.mimeTypes.join(","));
                }

                const builder = new google.picker.PickerBuilder()
                    .setAppId(APP_ID)
                    .setOAuthToken(token)
                    .setDeveloperKey(API_KEY)
                    .addView(myDriveView)
                    .addView(sharedView)
                    .addView(recentView)
                    .addView(new google.picker.DocsUploadView())
                    .setTitle(options?.title || "Seleccionar archivos de Google Drive");

                if (options?.multiSelect !== false) {
                    builder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
                }

                builder.enableFeature(google.picker.Feature.NAVIGABLE);

                const picker = builder
                    .setCallback(async (data: any) => {
                        console.log("Picker callback data:", data);

                        if (data.action === google.picker.Action.PICKED || data.action === 'picked') {
                            // Filter out folders from final selection if mimeTypes are specified
                            const validDocs = options?.mimeTypes?.length
                                ? data.docs.filter((doc: any) => 
                                    options.mimeTypes?.some(type => {
                                        if (type.endsWith("/*")) {
                                            return doc.mimeType?.startsWith(type.replace("/*", ""));
                                        }
                                        return doc.mimeType === type;
                                    })
                                )
                                : data.docs;

                            if (validDocs.length === 0 && data.docs.length > 0) {
                                toast.error("Por favor, selecciona archivos del tipo permitido, no carpetas.");
                                return; // Keep picker open if nothing valid was picked
                            }

                            const files: DriveFile[] = validDocs.map((doc: any) => ({
                                id: doc.id,
                                name: doc.name,
                                mimeType: doc.mimeType,
                                url: doc.mimeType?.startsWith("image/")
                                    ? `/api/drive-image?id=${doc.id}`
                                    : doc.url,
                                iconUrl: doc.iconUrl,
                                lastEditedUtc: doc.lastEditedUtc,
                            }));

                            // Auto-share the selected files if they are images (required for proxy to work)
                            if (options?.externalAccessToken || accessTokenRef.current) {
                                const tokenToUse = options?.externalAccessToken || accessTokenRef.current;
                                if (tokenToUse) {
                                    await Promise.all(
                                        files
                                            .filter((f) => f.mimeType?.startsWith("image/"))
                                            .map((f) =>
                                                fetch(`https://www.googleapis.com/drive/v3/files/${f.id}/permissions`, {
                                                    method: "POST",
                                                    headers: {
                                                        Authorization: `Bearer ${tokenToUse}`,
                                                        "Content-Type": "application/json",
                                                    },
                                                    body: JSON.stringify({
                                                        type: "anyone",
                                                        role: "reader",
                                                    }),
                                                }).then(async (res) => {
                                                    if (!res.ok) {
                                                        const errData = await res.json().catch(() => null);
                                                        console.warn("Could not auto-share Drive file:", errData || res.statusText);
                                                        toast.warning(
                                                            `No se pudo hacer pública la imagen "${f.name}". Asegúrate de compartirla manualmente en Google Drive para que tus alumnos puedan verla.`,
                                                            { duration: 6000 }
                                                        );
                                                    }
                                                })
                                            )
                                    ).catch((err) => {
                                        console.error("Auto-share error:", err);
                                    });
                                }
                            }

                            setIsLoading(false);
                            onDone(files);
                        } else if (data.action === google.picker.Action.CANCEL || data.action === 'cancel') {
                            setIsLoading(false);
                            onDone([]);
                        }
                    })
                    .build();

                picker.setVisible(true);
            } catch (error) {
                console.error("Error building or showing picker:", error);
                setIsLoading(false);
                toast.error("Error al abrir el selector de Google Drive");
                onDone([]);
            }
        },
        []
    );

    return { openPicker, isLoading };
}
