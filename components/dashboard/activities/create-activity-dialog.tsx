"use client";

import { useRef, useState } from "react";
import {
  Check,
  CircleHelp,
  Clock,
  HardDrive,
  LayoutGrid,
  Loader2,
  Palette,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { createActivity } from "@/app/dashboard/units/[id]/actions";
import {
  ACTIVITY_IDENTITY_COLORS,
  ACTIVITY_IDENTITY_PRESETS,
  buildActivityPresetLogoUrl,
  getActivityIdentityColor,
  getActivityIdentityPreset,
  type ActivityIdentityPresetValue,
} from "@/components/dashboard/activities/activity-identity";
import {
  CREATE_DIALOG_BODY_CLASS,
  CREATE_DIALOG_CONTENT_CLASS,
  CREATE_DIALOG_FOOTER_CLASS,
  CREATE_DIALOG_HEADER_CLASS,
  CREATE_DIALOG_INPUT_CLASS,
  CREATE_DIALOG_LABEL_CLASS,
  CREATE_DIALOG_PRIMARY_ACTION_CLASS,
  CREATE_DIALOG_SELECT_CONTENT_CLASS,
  CREATE_DIALOG_SELECT_TRIGGER_CLASS,
  CREATE_DIALOG_TEXTAREA_CLASS,
} from "@/components/dashboard/shared/create-dialog-styles";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";
import { cn } from "@/lib/utils";

interface CreateActivityDialogProps {
  unitId: string;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
}

const DEFAULT_PRESET: ActivityIdentityPresetValue = "theory";
const DEFAULT_COLOR = "sky";

export function CreateActivityDialog({
  unitId,
  trigger,
  children,
}: CreateActivityDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [selectedPreset, setSelectedPreset] =
    useState<ActivityIdentityPresetValue>(DEFAULT_PRESET);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [customIconUrl, setCustomIconUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Bajo");
  const [duration, setDuration] = useState("");
  const { openPicker, isLoading: isPickerLoading } = useGoogleDrivePicker();

  const selectedPresetConfig = getActivityIdentityPreset(selectedPreset);
  const selectedColorConfig = getActivityIdentityColor(selectedColor);
  const SelectedPresetIcon = selectedPresetConfig.icon;

  const resetDialog = () => {
    formRef.current?.reset();
    setSelectedPreset(DEFAULT_PRESET);
    setSelectedColor(DEFAULT_COLOR);
    setCustomIconUrl(null);
    setTitle("");
    setDescription("");
    setDifficulty("Bajo");
    setDuration("");
    setActiveTab("general");
    setOpen(false);
  };

  const handlePickIcon = async () => {
    try {
      const files = await openPicker({
        mimeTypes: ["image/*"],
        multiSelect: false,
        title: "Seleccionar identidad visual del reto",
      });

      if (files.length > 0) {
        setCustomIconUrl(files[0].url);
      }
    } catch (error) {
      console.error("Picker error:", error);
      toast.error("Error al abrir el selector de Google Drive");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    formData.append("unit_id", unitId);
    formData.append(
      "logo_url",
      customIconUrl ?? buildActivityPresetLogoUrl(selectedPreset, selectedColor)
    );

    const result = await createActivity(formData);
    setLoading(false);

    if (result?.error) {
      toast.error(`Error al crear el reto: ${result.error}`);
      return;
    }

    toast.success("Reto creado con exito");
    resetDialog();
  };

  const finalTrigger = children || trigger;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetDialog();
          return;
        }

        setOpen(true);
      }}
      modal={false}
    >
      <DialogTrigger asChild>
        {finalTrigger ? (
          finalTrigger
        ) : (
          <Button className="h-9 bg-accent-blue px-4 font-mono text-[10px] font-bold tracking-widest text-primary-foreground">
            <Plus className="mr-2 size-4" />
            NUEVO RETO
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={`max-w-3xl ${CREATE_DIALOG_CONTENT_CLASS}`}
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader className={CREATE_DIALOG_HEADER_CLASS}>
          <DialogTitle>Nuevo reto</DialogTitle>
          <DialogDescription>
            Define el contenido y la identidad visual de la nueva actividad.
          </DialogDescription>
        </DialogHeader>

        <form id="create-activity-form" ref={formRef} onSubmit={handleSubmit}>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex h-[500px] flex-col"
          >
            <div className="shrink-0 border-b border-border/50 px-6">
              <TabsList className="h-12 gap-6 bg-transparent p-0">
                <TabsTrigger
                  value="general"
                  className="h-full rounded-none border-b-2 border-transparent px-2 data-[state=active]:border-accent-blue data-[state=active]:bg-transparent"
                >
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="identity"
                  className="h-full rounded-none border-b-2 border-transparent px-2 data-[state=active]:border-accent-blue data-[state=active]:bg-transparent"
                >
                  Identidad visual
                </TabsTrigger>
              </TabsList>
            </div>

            <div className={`${CREATE_DIALOG_BODY_CLASS} flex-1 overflow-hidden`}>
              <TabsContent
                value="general"
                className="mt-0 h-full overflow-y-auto pr-1"
              >
                <div className="grid gap-6 md:grid-cols-[140px_1fr] md:gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <Label className={`${CREATE_DIALOG_LABEL_CLASS} block text-center`}>
                        Preview
                      </Label>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-text-muted transition-colors hover:text-foreground"
                              aria-label="Informacion sobre la identidad visual"
                            >
                              <CircleHelp className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs border-border-strong bg-surface-dark text-foreground">
                            La identidad visual del reto se configura en la pestana{" "}
                            <span className="font-semibold">Identidad visual</span>.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-surface-dark shadow-inner">
                      {customIconUrl ? (
                        <img
                          src={customIconUrl}
                          alt="Preview del reto"
                          className="size-full object-contain p-4"
                        />
                      ) : (
                        <SelectedPresetIcon
                          className={cn("size-16", selectedColorConfig.className)}
                          style={selectedColorConfig.style}
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title" className={CREATE_DIALOG_LABEL_CLASS}>
                        Titulo del reto
                      </Label>
                      <Input
                        id="title"
                        name="title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Ej: Variables y tipos de datos"
                        className={`${CREATE_DIALOG_INPUT_CLASS} h-11`}
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="description" className={CREATE_DIALOG_LABEL_CLASS}>
                        Descripcion
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Instrucciones breves para el alumno..."
                        className={`${CREATE_DIALOG_TEXTAREA_CLASS} min-h-[110px] resize-none`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="difficulty" className={CREATE_DIALOG_LABEL_CLASS}>
                          Dificultad
                        </Label>
                        <Select name="difficulty" value={difficulty} onValueChange={setDifficulty}>
                          <SelectTrigger
                            className={`${CREATE_DIALOG_SELECT_TRIGGER_CLASS} h-10 text-xs`}
                          >
                            <SelectValue placeholder="Dificultad" />
                          </SelectTrigger>
                          <SelectContent
                            className={`${CREATE_DIALOG_SELECT_CONTENT_CLASS} z-[80]`}
                          >
                            <SelectItem value="Bajo">
                              <div className="flex items-center gap-2 text-accent-green">
                                <Zap className="size-3" />
                                Facil
                              </div>
                            </SelectItem>
                            <SelectItem value="Medio">
                              <div className="flex items-center gap-2 text-accent-amber">
                                <Zap className="size-3" />
                                Medio
                              </div>
                            </SelectItem>
                            <SelectItem value="Difícil">
                              <div className="flex items-center gap-2 text-accent-orange">
                                <Zap className="size-3" />
                                Dificil
                              </div>
                            </SelectItem>
                            <SelectItem value="Experto">
                              <div className="flex items-center gap-2 text-red-700">
                                <Zap className="size-3" />
                                Experto
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="duration" className={CREATE_DIALOG_LABEL_CLASS}>
                          Duracion
                        </Label>
                        <div className="relative">
                          <Input
                            id="duration"
                            name="duration"
                            value={duration}
                            onChange={(event) => setDuration(event.target.value)}
                            placeholder="30"
                            className={`${CREATE_DIALOG_INPUT_CLASS} h-10 pl-8 text-xs`}
                          />
                          <Clock className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="identity"
                className="mt-0 h-full overflow-y-auto pr-1"
              >
                <div className="grid gap-6 lg:grid-cols-[180px_1fr] lg:gap-8">
                  <div className="space-y-4">
                    <Label className={`${CREATE_DIALOG_LABEL_CLASS} block text-center`}>
                      Identidad visual
                    </Label>

                    <div className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-surface-dark shadow-inner">
                      {customIconUrl ? (
                        <img
                          src={customIconUrl}
                          alt="Identidad visual del reto"
                          className="size-full object-contain p-4"
                        />
                      ) : (
                        <SelectedPresetIcon
                          className={cn(
                            "size-full max-h-[96px] max-w-[96px]",
                            selectedColorConfig.className
                          )}
                          style={selectedColorConfig.style}
                        />
                      )}

                      <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
                        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-4">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-9 rounded-full text-white transition-transform group-hover:scale-100 hover:bg-white/20"
                              onClick={handlePickIcon}
                              disabled={isPickerLoading}
                              title="Elegir desde Google Drive"
                            >
                              {isPickerLoading ? (
                                <Loader2 className="size-5 animate-spin" />
                              ) : (
                                <HardDrive className="size-5" />
                              )}
                            </Button>

                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-9 rounded-full text-white transition-transform group-hover:scale-100 hover:bg-red-500/40"
                              onClick={() => {
                                setCustomIconUrl(null);
                                setSelectedPreset(DEFAULT_PRESET);
                                setSelectedColor(DEFAULT_COLOR);
                              }}
                              title="Restablecer identidad visual"
                              disabled={
                                !customIconUrl &&
                                selectedPreset === DEFAULT_PRESET &&
                                selectedColor === DEFAULT_COLOR
                              }
                            >
                              <Trash2 className="size-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="px-2 text-center text-[10px] font-medium leading-relaxed text-text-muted">
                      En hover puedes subir una imagen desde Drive o restaurar el
                      icono base.
                    </p>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-border/50 bg-surface-dark/60 p-5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="size-4 text-accent-blue" />
                        <span className={CREATE_DIALOG_LABEL_CLASS}>
                          Iconos predeterminados
                        </span>
                      </div>

                      {customIconUrl ? (
                        <span className="text-[10px] font-mono uppercase tracking-widest text-accent-amber">
                          Usando imagen personalizada desde Drive
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                          Elige el icono base del reto
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                      {ACTIVITY_IDENTITY_PRESETS.map((preset) => {
                        const isSelected =
                          selectedPreset === preset.value && !customIconUrl;

                        return (
                          <Button
                            key={preset.value}
                            type="button"
                            variant="ghost"
                            className={cn(
                              "relative flex h-[4.5rem] items-center justify-center rounded-xl border transition-all hover:bg-accent-blue/10 hover:text-accent-blue",
                              isSelected
                                ? "border-accent-blue/40 bg-accent-blue/15 text-accent-blue shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
                                : "border-border/50 bg-surface text-text-muted"
                            )}
                            onClick={() => {
                              setSelectedPreset(preset.value);
                              setCustomIconUrl(null);
                            }}
                            title={preset.label}
                          >
                            {isSelected ? (
                              <div className="absolute right-1.5 top-1.5 rounded-full bg-accent-blue/20 p-1 text-accent-blue">
                                <Check className="size-3" />
                              </div>
                            ) : null}
                            <preset.icon
                              className={cn(
                                "size-8 shrink-0",
                                isSelected ? selectedColorConfig.className : "text-text-muted"
                              )}
                              style={isSelected ? selectedColorConfig.style : undefined}
                            />
                          </Button>
                        );
                      })}
                    </div>

                    <div className="space-y-3 rounded-xl border border-border/50 bg-surface/70 p-4">
                      <div className="flex items-center gap-2">
                        <Palette className="size-4 text-accent-blue" />
                        <span className={CREATE_DIALOG_LABEL_CLASS}>
                          Color del icono
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {ACTIVITY_IDENTITY_COLORS.map((color) => {
                          const isSelected = selectedColor === color.value;

                          return (
                            <button
                              key={color.value}
                              type="button"
                              className={cn(
                                "relative flex size-10 items-center justify-center rounded-full border border-white/10 transition-transform hover:scale-105",
                                color.swatchClassName,
                                isSelected && "ring-2 ring-offset-2 ring-offset-surface-dark",
                                isSelected && color.ringClassName
                              )}
                              onClick={() => {
                                setSelectedColor(color.value);
                                setCustomIconUrl(null);
                              }}
                              aria-label={`Seleccionar color ${color.label}`}
                              title={color.label}
                            >
                              {isSelected ? (
                                <Check className="size-4 text-slate-950" />
                              ) : null}
                            </button>
                          );
                        })}

                        <label
                          className={cn(
                            "relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[conic-gradient(from_180deg_at_50%_50%,#38bdf8_0deg,#34d399_72deg,#fbbf24_144deg,#f472b6_216deg,#a78bfa_288deg,#38bdf8_360deg)] transition-transform hover:scale-105",
                            selectedColorConfig.isCustom &&
                              "ring-2 ring-white/70 ring-offset-2 ring-offset-surface-dark"
                          )}
                          title="Color personalizado"
                        >
                          <input
                            type="color"
                            className="absolute inset-0 cursor-pointer opacity-0"
                            value={selectedColorConfig.hex}
                            onChange={(event) => {
                              setSelectedColor(event.target.value);
                              setCustomIconUrl(null);
                            }}
                            aria-label="Seleccionar color personalizado"
                          />
                          <Palette className="size-4 text-slate-950" />
                        </label>
                      </div>

                      <p className="text-[10px] leading-relaxed text-text-muted">
                        El color se aplica a los iconos predeterminados. Si subes
                        una imagen desde Drive, esta tendra prioridad visual.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </form>

        <DialogFooter className={CREATE_DIALOG_FOOTER_CLASS}>
          <Button
            type="button"
            variant="ghost"
            onClick={resetDialog}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="create-activity-form"
            disabled={loading}
            className={CREATE_DIALOG_PRIMARY_ACTION_CLASS}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                CREANDO...
              </>
            ) : (
              "CREAR RETO"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
