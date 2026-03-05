"use client";

import { useCallback, useRef, useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY!;
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID!;

const SCOPES = "https://www.googleapis.com/auth/drive.file";

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    url: string;
    iconUrl: string;
    lastEditedUtc: number;
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
    const openPicker = useCallback((): Promise<DriveFile[]> => {
        return new Promise(async (resolve, reject) => {
            setIsLoading(true);

            try {
                // Load scripts if needed
                if (!pickerInitedRef.current) await initGapi();
                if (!gisInitedRef.current) await initGis();

                // Create the token client (handles OAuth consent)
                if (!tokenClientRef.current) {
                    tokenClientRef.current = google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: SCOPES,
                        callback: () => { }, // will be overridden below
                        error_callback: (error) => {
                            console.log("GIS Error:", error);
                            setIsLoading(false);
                            // Avoid rejecting with an unhandled promise if they just close the window
                            if (error?.type === 'popup_closed') {
                                resolve([]);
                            } else {
                                reject(new Error(error?.type || "Autenticación fallida"));
                            }
                        }
                    });
                }

                // Override callback for this invocation
                tokenClientRef.current.callback = (tokenResponse: google.accounts.oauth2.TokenResponse) => {
                    if (tokenResponse.error) {
                        setIsLoading(false);
                        reject(new Error(tokenResponse.error));
                        return;
                    }
                    accessTokenRef.current = tokenResponse.access_token;
                    showPicker(tokenResponse.access_token, resolve);
                };

                // If we already have a token, try to reuse it
                if (accessTokenRef.current) {
                    showPicker(accessTokenRef.current, resolve);
                } else {
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
        (token: string, onDone: (files: DriveFile[]) => void) => {
            const picker = new google.picker.PickerBuilder()
                .setAppId(APP_ID)
                .setOAuthToken(token)
                .setDeveloperKey(API_KEY)
                .addView(
                    new google.picker.DocsView()
                        .setIncludeFolders(true)
                        .setSelectFolderEnabled(false)
                )
                .addView(new google.picker.DocsUploadView())
                .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
                .enableFeature(google.picker.Feature.NAV_HIDDEN)
                .setTitle("Seleccionar archivos de Google Drive")
                .setCallback((data: any) => {
                    console.log("Picker callback data:", data);

                    if (data.action === google.picker.Action.PICKED || data.action === 'picked') {
                        const files: DriveFile[] = data.docs.map((doc: any) => ({
                            id: doc.id,
                            name: doc.name,
                            mimeType: doc.mimeType,
                            url: doc.mimeType?.startsWith("image/")
                                ? `https://lh3.googleusercontent.com/d/${doc.id}`
                                : doc.url,
                            iconUrl: doc.iconUrl,
                            lastEditedUtc: doc.lastEditedUtc,
                        }));
                        setIsLoading(false);
                        onDone(files);
                    } else if (data.action === google.picker.Action.CANCEL || data.action === 'cancel') {
                        setIsLoading(false);
                        onDone([]);
                    }
                })
                .build();

            picker.setVisible(true);
        },
        []
    );

    return { openPicker, isLoading };
}
