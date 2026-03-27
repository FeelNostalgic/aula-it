"use client";

import { useState } from "react";
import {
  Check,
  CircleHelp,
  HardDrive,
  LayoutGrid,
  Palette,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createModule } from "@/app/dashboard/actions";
import {
  getModuleIconColorOption,
  getModuleIconOption,
  getModuleIconVisualProps,
  MODULE_ICON_COLORS,
  MODULE_ICON_OPTIONS,
} from "@/components/dashboard/modules/module-identity";
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

interface CreateModuleDialogProps {
  children?: React.ReactNode;
}

export function CreateModuleDialog({
  children,
}: CreateModuleDialogProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("BookOpen");
  const [selectedColor, setSelectedColor] = useState("default");
  const [customIconUrl, setCustomIconUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { openPicker, isLoading: isPickerLoading } = useGoogleDrivePicker();

  const handlePickIcon = async () => {
    try {
      const files = await openPicker({
        mimeTypes: ["image/*"],
        multiSelect: false,
        title: "Seleccionar icono para el modulo",
      });

      if (files.length > 0) {
        setCustomIconUrl(files[0].url);
      }
    } catch (error) {
      console.error("Picker error:", error);
      toast.error("Error al abrir el selector de Google Drive");
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedIcon("BookOpen");
    setSelectedColor("default");
    setCustomIconUrl(null);
    setActiveTab("general");
    setOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name) {
      toast.error("El nombre del modulo es obligatorio");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("icon", selectedIcon);
    formData.append("icon_style", selectedColor);

    if (customIconUrl) {
      formData.append("custom_icon_url", customIconUrl);
    }

    const result = await createModule(null, formData);
    setIsLoading(false);

    if (result?.error) {
      toast.error(`Error al crear el modulo: ${result.error}`);
      return;
    }

    toast.success(`Modulo "${name}" creado correctamente`);
    resetForm();
    router.refresh();
  };

  const SelectedIconComponent = getModuleIconOption(selectedIcon).icon;
  const selectedColorVisual = getModuleIconVisualProps(selectedColor);
  const selectedColorOption = getModuleIconColorOption(selectedColor);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm();
          return;
        }

        setOpen(true);
      }}
      modal={false}
    >
      <DialogTrigger asChild>
        {children ?? (
          <Button className="h-9 bg-accent-blue px-4 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:bg-accent-blue/90">
            <Plus className="mr-2 size-4" />
            NUEVO MODULO
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
          <DialogTitle>Nuevo modulo</DialogTitle>
          <DialogDescription>
            Configura los detalles del nuevo modulo de aprendizaje.
          </DialogDescription>
        </DialogHeader>

        <form id="create-module-form" onSubmit={handleSubmit}>
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
                              aria-label="Informacion sobre la configuracion del icono"
                            >
                              <CircleHelp className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs border-border-strong bg-surface-dark text-foreground">
                            La identidad visual del modulo se configura en la
                            pestana <span className="font-semibold">Identidad visual</span>.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-surface-dark shadow-inner">
                      {customIconUrl ? (
                        <img
                          src={customIconUrl}
                          alt="Icono"
                          className="size-full object-contain p-4"
                        />
                      ) : (
                        <SelectedIconComponent
                          className={cn("size-16", selectedColorVisual.className)}
                          style={selectedColorVisual.style}
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className={CREATE_DIALOG_LABEL_CLASS}>
                        Nombre del modulo
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="ej. Ciberseguridad avanzada"
                        className={`${CREATE_DIALOG_INPUT_CLASS} h-11`}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="description"
                        className={CREATE_DIALOG_LABEL_CLASS}
                      >
                        Descripcion
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Describe los objetivos y contenidos del modulo..."
                        className={`${CREATE_DIALOG_TEXTAREA_CLASS} min-h-[120px] resize-none`}
                      />
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
                          alt="Icono"
                          className="size-full object-contain p-4"
                        />
                      ) : (
                        <SelectedIconComponent
                          className={cn(
                            "size-full max-h-[96px] max-w-[96px]",
                            selectedColorVisual.className
                          )}
                          style={selectedColorVisual.style}
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
                              title="Elegir de Google Drive"
                            >
                              <HardDrive className="size-5" />
                            </Button>

                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-9 rounded-full text-white transition-transform group-hover:scale-100 hover:bg-red-500/40"
                              onClick={() => {
                                setCustomIconUrl(null);
                                setSelectedIcon("BookOpen");
                                setSelectedColor("default");
                              }}
                              title="Restablecer icono"
                              disabled={
                                !customIconUrl &&
                                selectedIcon === "BookOpen" &&
                                selectedColor === "default"
                              }
                            >
                              <Trash2 className="size-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="px-2 text-center text-[10px] font-medium leading-relaxed text-text-muted">
                      En hover puedes subir una imagen desde Drive o restablecer
                      el icono actual.
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
                          Elige el icono base del módulo
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                      {MODULE_ICON_OPTIONS.map((item) => {
                        const isSelected =
                          selectedIcon === item.value && !customIconUrl;

                        return (
                          <Button
                            key={item.value}
                            type="button"
                            variant="ghost"
                            className={cn(
                              "relative flex h-[72px] items-center justify-center rounded-xl border transition-all hover:bg-accent-blue/10 hover:text-accent-blue",
                              isSelected
                                ? "border-accent-blue/40 bg-accent-blue/15 text-accent-blue shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
                                : "border-border/50 bg-surface text-text-muted"
                            )}
                            onClick={() => {
                              setSelectedIcon(item.value);
                              setCustomIconUrl(null);
                            }}
                            title={item.label}
                          >
                            {isSelected && (
                              <div className="absolute right-1.5 top-1.5 rounded-full bg-accent-blue/20 p-1 text-accent-blue">
                                <Check className="size-3" />
                              </div>
                            )}
                            <item.icon
                              className={cn(
                                "size-8 shrink-0",
                                isSelected ? selectedColorVisual.className : undefined
                              )}
                              style={isSelected ? selectedColorVisual.style : undefined}
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
                        {MODULE_ICON_COLORS.map((color) => {
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
                              onClick={() => setSelectedColor(color.value)}
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
                            selectedColorOption.isCustom &&
                              "ring-2 ring-white/70 ring-offset-2 ring-offset-surface-dark"
                          )}
                          title="Color personalizado"
                        >
                          <input
                            type="color"
                            className="absolute inset-0 cursor-pointer opacity-0"
                            value={selectedColorOption.hex}
                            onChange={(event) => setSelectedColor(event.target.value)}
                            aria-label="Seleccionar color personalizado"
                          />
                          <Palette className="size-4 text-slate-950" />
                        </label>
                        <p className="text-[10px] leading-relaxed text-text-muted">
                          El color se aplica a los iconos predeterminados. Si subes
                          una imagen desde Drive, esta tendra prioridad visual.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </form>

        <DialogFooter className={CREATE_DIALOG_FOOTER_CLASS}>
          <Button variant="ghost" onClick={resetForm} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="create-module-form"
            disabled={isLoading || !name}
            className={CREATE_DIALOG_PRIMARY_ACTION_CLASS}
          >
            {isLoading ? "CREANDO..." : "CREAR MODULO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
