"use client";

import { useCallback, useRef, useState } from "react";
import { getDriveFilesToAutoShare } from "@/lib/google-drive-sharing";

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
    autoShareAll?: boolean; // Auto-share all file types (not just images). Use for student-visible Drive content.
    selectFolders?: boolean;
    includeSharedDrives?: boolean;
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
                        .setSelectFolderEnabled(!!options?.selectFolders)
                        .setOwnedByMe(ownedByMe)
                        .setLabel(label);
                    
                    // Note: Setting setMimeTypes often causes folders to appear empty if they don't contain 
                    // matching files directly. To allow full navigation like the "Insignias" modal,
                    // we'll avoid restrictive view filters when folders are enabled.
                    // We'll handle the selection restriction in the callback instead.
                    
                    return view;
                };

                const createSharedDrivesView = () => {
                    return new google.picker.DocsView(google.picker.ViewId.DOCS)
                        .setEnableDrives(true)
                        .setIncludeFolders(true)
                        .setSelectFolderEnabled(!!options?.selectFolders)
                        .setLabel("Unidades compartidas");
                };

                const myDriveView = createDocsView("Mi unidad", true);
                const sharedView = createDocsView("Compartidos conmigo", false);
                const recentView = new google.picker.DocsView(google.picker.ViewId.RECENTLY_PICKED)
                    .setLabel("Recientes");
                if (options?.selectFolders) {
                    recentView.setIncludeFolders(true);
                }
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
                    .setTitle(options?.title || "Seleccionar archivos de Google Drive");

                if (!options?.selectFolders) {
                    builder.addView(new google.picker.DocsUploadView());
                }

                if (options?.includeSharedDrives) {
                    builder.addView(createSharedDrivesView());
                }

                if (options?.multiSelect !== false) {
                    builder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
                }

                builder.enableFeature(google.picker.Feature.NAVIGABLE);

                const picker = builder
                    .setCallback(async (data: any) => {
                        console.log("Picker callback data:", data);

                        if (data.action === google.picker.Action.PICKED || data.action === 'picked') {
                            const isFolderSelection = !!options?.selectFolders;
                            const validDocs = data.docs.filter((doc: any) => {
                                const mimeType = typeof doc.mimeType === "string" ? doc.mimeType : "";

                                if (isFolderSelection) {
                                    return mimeType === "application/vnd.google-apps.folder";
                                }

                                if (!options?.mimeTypes?.length) {
                                    return mimeType !== "application/vnd.google-apps.folder";
                                }

                                return options.mimeTypes.some(type => {
                                    if (type.endsWith("/*")) {
                                        return mimeType.startsWith(type.replace("/*", ""));
                                    }
                                    return mimeType === type;
                                });
                            });

                            if (validDocs.length === 0 && data.docs.length > 0) {
                                toast.error(
                                    isFolderSelection
                                        ? "Selecciona una carpeta válida de Google Drive."
                                        : "Por favor, selecciona archivos del tipo permitido, no carpetas."
                                );
                                return; // Keep picker open if nothing valid was picked
                            }

                            const files: DriveFile[] = validDocs.map((doc: any) => ({
                                id: doc.id,
                                name: doc.name,
                                mimeType: doc.mimeType,
                                url: doc.mimeType === "application/vnd.google-apps.folder"
                                    ? `https://drive.google.com/drive/folders/${doc.id}`
                                    : doc.mimeType?.startsWith("image/")
                                    ? `/api/drive-image?id=${doc.id}`
                                    : doc.url,
                                iconUrl: doc.iconUrl,
                                lastEditedUtc: typeof doc.lastEditedUtc === "number" ? doc.lastEditedUtc : 0,
                            }));

                            // Auto-share selected files. Always shares images (required for proxy).
                            // When autoShareAll=true, also shares non-image files (e.g. PDFs/videos in unit resources).
                            if (!isFolderSelection && (options?.externalAccessToken || accessTokenRef.current)) {
                                const tokenToUse = options?.externalAccessToken || accessTokenRef.current;
                                if (tokenToUse) {
                                    const filesToShare = getDriveFilesToAutoShare(files, options?.autoShareAll ?? false);
                                    await Promise.all(
                                        filesToShare.map(async (f) => {
                                            // 1. Set public "anyone reader" permission
                                            const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}/permissions`, {
                                                method: "POST",
                                                headers: {
                                                    Authorization: `Bearer ${tokenToUse}`,
                                                    "Content-Type": "application/json",
                                                },
                                                body: JSON.stringify({ type: "anyone", role: "reader" }),
                                            });
                                            if (!permRes.ok) {
                                                const errData = await permRes.json().catch(() => null);
                                                console.warn("Could not auto-share Drive file:", errData || permRes.statusText);
                                                toast.warning(
                                                    `No se pudo compartir "${f.name}". Compártelo manualmente en Google Drive.`,
                                                    { duration: 6000 }
                                                );
                                                return;
                                            }
                                            // 2. Allow downloads for all viewers (fixes video/binary download restriction)
                                            if (options?.autoShareAll) {
                                                await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
                                                    method: "PATCH",
                                                    headers: {
                                                        Authorization: `Bearer ${tokenToUse}`,
                                                        "Content-Type": "application/json",
                                                    },
                                                    body: JSON.stringify({ copyRequiresWriterPermission: false }),
                                                }).catch((err) => console.warn("Could not unset copyRequiresWriterPermission:", err));
                                            }
                                        })
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
