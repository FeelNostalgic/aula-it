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
                color="rgba(255, 255, 255, 0.03)"
                className="bg-[#020609]"
            />

            {/* Secondary Dots for texture */}
            <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="rgba(255, 255, 255, 0.05)"
            />

            {/* Industrial Overlay Gradient */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,9,0.4)_100%)]" />

            {/* Scanlines Effect */}
            <div
                className="absolute inset-0 opacity-40 pointer-events-none z-10 bg-size-[100%_2px,3px_100%]"
                style={{
                    backgroundImage: 'linear-gradient(to bottom, transparent 1px, rgba(255,255,255,0.02) 1px), linear-gradient(to right, transparent 2px, rgba(255,255,255,0.02) 2px)'
                }}
            />
        </>
    );
}
