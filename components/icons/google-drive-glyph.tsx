interface GoogleDriveGlyphProps {
    className?: string;
}

export function GoogleDriveGlyph({ className }: GoogleDriveGlyphProps) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <path d="M9.2 2.5h5.6l6.4 11h-5.6l-6.4-11Z" fill="#34A853" />
            <path d="M9.2 2.5 2.8 13.5l2.8 4.8 6.4-11-2.8-4.8Z" fill="#FBBC05" />
            <path d="M21.2 13.5 18.4 18.3H5.6l2.8-4.8h12.8Z" fill="#4285F4" />
        </svg>
    );
}
