// Type declarations for Google Picker API and Google Identity Services (GIS)
// These APIs are loaded at runtime via <script> tags, not npm packages.

declare namespace google {
    namespace accounts {
        namespace oauth2 {
            interface TokenClient {
                callback: (response: TokenResponse) => void;
                requestAccessToken: (config?: { prompt?: string }) => void;
            }

            interface TokenResponse {
                access_token: string;
                error?: string;
                expires_in: number;
                scope: string;
                token_type: string;
            }

            function initTokenClient(config: {
                client_id: string;
                scope: string;
                callback: (response: TokenResponse) => void;
                error_callback?: (error: any) => void;
            }): TokenClient;
        }
    }

    namespace picker {
        enum Action {
            CANCEL = "cancel",
            PICKED = "picked",
        }

        enum Feature {
            MULTISELECT_ENABLED = "multiselect",
            NAV_HIDDEN = "navHidden",
            NAVIGABLE = "navigable",
        }

        interface ResponseObject {
            action: Action;
            docs: any[];
        }

        class PickerBuilder {
            setAppId(appId: string): PickerBuilder;
            setOAuthToken(token: string): PickerBuilder;
            setDeveloperKey(key: string): PickerBuilder;
            addView(view: any): PickerBuilder;
            enableFeature(feature: Feature): PickerBuilder;
            setTitle(title: string): PickerBuilder;
            setCallback(callback: (data: ResponseObject) => void): PickerBuilder;
            build(): Picker;
        }

        class Picker {
            setVisible(visible: boolean): void;
        }

        enum ViewId {
            DOCS = "all",
            RECENTLY_PICKED = "recently-picked",
        }

        class DocsView {
            constructor(viewId?: ViewId);
            setEnableDrives(enabled: boolean): DocsView;
            setIncludeFolders(include: boolean): DocsView;
            setSelectFolderEnabled(enabled: boolean): DocsView;
            setMimeTypes(mimeTypes: string): DocsView;
            setOwnedByMe(ownedByMe: boolean): DocsView;
            setStarred(starred: boolean): DocsView;
            setParent(parentId: string): DocsView;
            setLabel(label: string): DocsView;
        }

        class DocsUploadView {
            setIncludeFolders(include: boolean): DocsUploadView;
        }
    }
}

declare namespace gapi {
    function load(apiName: string, callback: () => void): void;
}
