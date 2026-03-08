"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createMilestone, updateMilestone } from "./actions";

type FormValues = {
    title: string;
    description?: string;
    target_points: number;
    reward: string;
    status: 'draft' | 'active' | 'completed' | 'archived';
};

const formSchema = z.object({
    title: z.string().min(2, "El título debe tener al menos 2 caracteres"),
    description: z.string().optional(),
    target_points: z.coerce.number().min(1, "El objetivo debe ser mayor a 0"),
    reward: z.string().min(2, "La recompensa es obligatoria"),
    status: z.enum(['draft', 'active', 'completed', 'archived']),
}) as z.ZodType<FormValues>;

interface Milestone {
    id: string;
    title: string;
    description: string | null;
    target_points: number;
    reward: string;
    status: 'draft' | 'active' | 'completed' | 'archived';
}

interface MilestoneFormProps {
    initialData?: Partial<Milestone> & { id?: string };
    trigger?: React.ReactNode;
}

export function MilestoneForm({ initialData, trigger }: MilestoneFormProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema as any) as any,
        defaultValues: {
            title: initialData?.title || "",
            description: initialData?.description || "",
            target_points: Number(initialData?.target_points) || 0,
            reward: initialData?.reward || "",
            status: (initialData?.status as any) || "draft",
        },
    });

    async function onSubmit(values: FormValues) {
        setIsLoading(true);
        try {
            const dataToSubmit = {
                ...values,
                description: values.description || "",
            };

            if (initialData?.id) {
                await updateMilestone(initialData.id, dataToSubmit);
                toast.success("Hito actualizado correctamente");
            } else {
                await createMilestone(dataToSubmit);
                toast.success("Hito creado correctamente");
            }
            setOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Error al guardar el hito");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2">
                        <Plus className="size-4" />
                        Nuevo Hito
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Editar Hito" : "Crear Nuevo Hito"}</DialogTitle>
                    <DialogDescription>
                        Define un objetivo cooperativo para todos los alumnos del curso.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Supervivientes de Backend" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Explica el objetivo a los alumnos..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="target_points"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>XP Objetivo</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField<FormValues>
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estado</FormLabel>
                                        <Select onValueChange={field.onChange} value={(field.value as any) || "draft"}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona estado" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="draft">Borrador</SelectItem>
                                                <SelectItem value="active">Activo</SelectItem>
                                                <SelectItem value="completed">Completado</SelectItem>
                                                <SelectItem value="archived">Archivado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="reward"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Recompensa</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: +1 pto extra examen" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Indica qué conseguirán los alumnos si alcanzan el objetivo.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Guardando..." : "Guardar Hito"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
