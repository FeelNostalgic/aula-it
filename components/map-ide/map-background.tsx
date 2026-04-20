"use client";

import React from 'react';
import { Background, BackgroundVariant } from '@xyflow/react';

export function MapBackground() {
    return (
        <>
            {/* Base Grid */}
            <Background
                variant={BackgroundVariant.Lines}
                gap={40}
                size={1}
                color="currentColor"
                className="bg-background text-border/25"
            />

            {/* Secondary Dots for texture */}
            <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="currentColor"
                className="text-border/35"
            />

            {/* Industrial Overlay Gradient */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,var(--color-background)_100%)] opacity-55" />

            {/* Scanlines Effect */}
            <div
                className="absolute inset-0 opacity-[0.14] pointer-events-none z-10 bg-size-[100%_2px,3px_100%]"
                style={{
                    backgroundImage:
                        "linear-gradient(to bottom, transparent 1px, color-mix(in srgb, var(--color-foreground) 8%, transparent) 1px), linear-gradient(to right, transparent 2px, color-mix(in srgb, var(--color-foreground) 8%, transparent) 2px)",
                }}
            />
        </>
    );
}
