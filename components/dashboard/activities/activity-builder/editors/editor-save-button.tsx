"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorSaveButtonProps {
    isSaving: boolean;
    isDirty: boolean;
    onSave: () => void | Promise<void>;
}

export function EditorSaveButton({ isSaving, isDirty, onSave }: EditorSaveButtonProps) {
    return (
        <Button
            onClick={onSave}
            disabled={isSaving || !isDirty}
            className="h-8 min-w-44"
            size="sm"
        >
            {isSaving ? (
                <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Guardando...
                </>
            ) : isDirty ? (
                "Guardar cambios"
            ) : (
                "Sin cambios"
            )}
        </Button>
    );
}

