"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createUnit } from "@/app/dashboard/modules/[id]/actions";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
    CREATE_DIALOG_BODY_CLASS,
    CREATE_DIALOG_CONTENT_CLASS,
    CREATE_DIALOG_FOOTER_CLASS,
    CREATE_DIALOG_HEADER_CLASS,
    CREATE_DIALOG_INPUT_CLASS,
    CREATE_DIALOG_LABEL_CLASS,
    CREATE_DIALOG_PRIMARY_ACTION_CLASS,
    CREATE_DIALOG_TEXTAREA_CLASS,
} from "@/components/dashboard/shared/create-dialog-styles";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button 
            type="submit" 
            disabled={pending} 
            className={CREATE_DIALOG_PRIMARY_ACTION_CLASS}
        >
            {pending ? "CREANDO..." : "CREAR UNIDAD"}
        </Button>
    );
}

interface CreateUnitDialogProps {
    moduleId: string;
    children?: React.ReactNode;
}

export function CreateUnitDialog({ moduleId, children }: CreateUnitDialogProps) {
    const [open, setOpen] = useState(false);

    async function handleSubmit(formData: FormData) {
        const result = await createUnit(null, formData);
        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success("Unidad didáctica creada correctamente");
            setOpen(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ?? (
                    <Button className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-9 px-4">
                        <Plus className="mr-2 size-4" />
                        UNIDAD DIDÁCTICA
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className={`sm:max-w-[425px] ${CREATE_DIALOG_CONTENT_CLASS}`}
             onInteractOutside={(e) => { e.preventDefault(); }}
             onPointerDownOutside={(e) => { e.preventDefault(); }}
             onEscapeKeyDown={(e) => { e.preventDefault(); }}>
                <DialogHeader className={CREATE_DIALOG_HEADER_CLASS}>
                    <DialogTitle>Nueva unidad didáctica</DialogTitle>
                    <DialogDescription>
                        Añade una nueva unidad didáctica a este módulo.
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit}>
                    <input type="hidden" name="module_id" value={moduleId} />

                    <div className={`${CREATE_DIALOG_BODY_CLASS} space-y-6`}>
                        <div className="space-y-2">
                            <Label htmlFor="name" className={CREATE_DIALOG_LABEL_CLASS}>
                                Nombre de la unidad
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Ej: U.D.1 Introducción a Redes"
                                className={`${CREATE_DIALOG_INPUT_CLASS} h-11`}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description" className={CREATE_DIALOG_LABEL_CLASS}>
                                Descripción
                            </Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Describe el enfoque y los objetivos principales de la unidad..."
                                className={`${CREATE_DIALOG_TEXTAREA_CLASS} min-h-[120px] resize-none`}
                            />
                        </div>
                    </div>

                    <DialogFooter className={CREATE_DIALOG_FOOTER_CLASS}>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
