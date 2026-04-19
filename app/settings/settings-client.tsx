"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { disconnectDrive, saveDriveStorageSettings, updateProfile } from "./actions";
import { toast } from "sonner";
import {
    ArrowLeft,
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    FolderOpen,
    HardDrive,
    Mail,
    User,
    Zap,
    BarChart3,
    Target,
    Edit2,
    Settings2,
    Eye,
    Medal,
    LockIcon,
    Database,
    Layout,
    Server,
    Monitor,
    Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserNav } from "@/components/dashboard/layout/user-nav";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { DRIVE_CONNECTION_STATUS, type DriveConnectionStatus } from "@/lib/drive-connection-status";
import { DRIVE_STORAGE_MODE, type DriveStorageSettings } from "@/lib/drive-storage-settings";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";
import { Progress } from "@/components/ui/progress";

interface SettingsClientProps {
    userEmail: string;
    initialFullName: string;
    initialGoogleEmail: string;
    initialIsPrivate: boolean;
    userAvatar: string;
    userId: string;
    isTeacher: boolean;
    driveStatus: DriveConnectionStatus;
    driveStorageSettings: DriveStorageSettings;
    globalXp: number;
    streakDays: number;
    earnedBadgesCount: number;
    activeSubmissionsCount: number;
    badges?: {
        id: string;
        name: string;
        description: string | null;
        iconUrl: string | null;
        unlocked: boolean;
        progress: number;
    }[];
}

export function SettingsClient({
    userEmail,
    initialFullName,
    initialGoogleEmail,
    initialIsPrivate,
    userAvatar,
    userId,
    isTeacher,
    driveStatus,
    driveStorageSettings: initialDriveStorageSettings,
    globalXp,
    streakDays,
    earnedBadgesCount,
    activeSubmissionsCount,
    badges = [],
}: SettingsClientProps) {
    const [fullName, setFullName] = useState(initialFullName);
    const [googleEmail, setGoogleEmail] = useState(initialGoogleEmail);
    const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
    const isClassroomStudent = userEmail.endsWith("@aula.local");
    const [isPending, startTransition] = useTransition();
    const [currentDriveStatus, setCurrentDriveStatus] = useState(driveStatus);
    const [isDisconnecting, startDisconnect] = useTransition();
    const [isSavingDriveSettings, startDriveSettingsTransition] = useTransition();
    const [driveStorageSettings, setDriveStorageSettings] = useState(initialDriveStorageSettings);
    
    const supabase = createClient();
    const router = useRouter();
    const { openPicker, isLoading: isDrivePickerLoading } = useGoogleDrivePicker();

    function handleSave(e: React.FormEvent) {
        e.preventDefault();
        startTransition(async () => {
            const result = await updateProfile({ fullName, googleEmail, isPrivate });
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Perfil actualizado correctamente.");
            }
        });
    }

    function handleUseAutomaticDriveFolder() {
        startDriveSettingsTransition(async () => {
            const result = await saveDriveStorageSettings({ mode: DRIVE_STORAGE_MODE.AUTO_ROOT });
            if (result.error) {
                toast.error(result.error);
                return;
            }

            if (result.settings) {
                setDriveStorageSettings(result.settings);
            }
            toast.success("Se ha restaurado la carpeta automática de Aula-it Entregas.");
        });
    }

    async function handleSelectDriveFolder() {
        try {
            const response = await fetch("/api/drive/token");
            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.access_token) {
                throw new Error(typeof data?.error === "string" ? data.error : "No se pudo obtener acceso a Google Drive.");
            }

            const files = await openPicker({
                externalAccessToken: data.access_token,
                includeSharedDrives: true,
                multiSelect: false,
                selectFolders: true,
                title: "Seleccionar carpeta base para entregas",
            });

            const folder = files[0];
            if (!folder) return;

            startDriveSettingsTransition(async () => {
                const result = await saveDriveStorageSettings({
                    mode: DRIVE_STORAGE_MODE.CUSTOM_FOLDER,
                    folderId: folder.id,
                });

                if (result.error) {
                    toast.error(result.error);
                    return;
                }

                if (result.settings) {
                    setDriveStorageSettings(result.settings);
                }
                toast.success(`La carpeta base ahora es "${folder.name}".`);
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "No se pudo seleccionar la carpeta de Google Drive.";
            toast.error(message);
        }
    }

    const isDriveConnected = currentDriveStatus === DRIVE_CONNECTION_STATUS.CONNECTED;
    const isDriveInvalid = currentDriveStatus === DRIVE_CONNECTION_STATUS.INVALID;
    const isAutomaticDriveFolder = driveStorageSettings.mode === DRIVE_STORAGE_MODE.AUTO_ROOT;
    const driveFolderLabel = driveStorageSettings.folderName ?? "Carpeta personalizada";

    // Simple level calculation
    const level = Math.floor(globalXp / 1000) + 1;

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Header with Back Button */}
            <header className="h-[68px] border-b border-border/50 bg-background flex items-center justify-between px-6 shrink-0 z-40">
                <div className="flex items-center gap-6">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.back()}
                        className="hover:bg-muted/50 rounded-full"
                    >
                        <ArrowLeft className="size-5" />
                        <span className="sr-only">Volver</span>
                    </Button>
                    <span className="font-bold text-lg tracking-tight">{isTeacher ? "Ajustes de perfil" : "Perfil de alumno"}</span>
                </div>
                <div className="flex items-center gap-6">
                    <UserNav
                        userEmail={userEmail}
                        userName={fullName}
                        isTeacher={isTeacher}
                        userId={userId}
                        userAvatar={userAvatar}
                        driveStatus={isTeacher ? currentDriveStatus : undefined}
                    />
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <Tabs defaultValue={isTeacher ? "settings" : "profile"} className="space-y-8">
                    <div className="flex items-center justify-start border-b border-border/40 mb-6 font-mono text-sm tracking-tighter">
                        <TabsList className="bg-transparent h-auto p-0 gap-8">
                            {!isTeacher && (
                                <TabsTrigger
                                    value="profile"
                                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 py-2 text-text-muted hover:text-foreground transition-colors uppercase font-bold"
                                >
                                    Perfil
                                </TabsTrigger>
                            )}
                            <TabsTrigger
                                value="settings"
                                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 py-2 text-text-muted hover:text-foreground transition-colors uppercase font-bold"
                            >
                                Ajustes
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {!isTeacher && (
                        <TabsContent value="profile" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Profile Header Card */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-1 bg-surface-dark/40 border-border/40 backdrop-blur-sm overflow-hidden group">
                                    <CardContent className="pt-8 pb-6 px-6 flex flex-col items-center text-center relative">
                                        <div className="relative mb-4">
                                            <Avatar className="size-28 border-4 border-background ring-4 ring-primary/20 shadow-2xl transition-transform duration-500 group-hover:scale-105">
                                                <AvatarImage src={userAvatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${fullName}`} />
                                                <AvatarFallback className="bg-accent-blue text-white text-3xl font-bold">
                                                    {fullName.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute -bottom-2 -right-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-background shadow-lg uppercase tracking-wider">
                                                LVL {level}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <h2 className="text-2xl font-black tracking-tight text-foreground">{fullName || "Estudiante"}</h2>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Stats Grid */}
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="bg-surface-dark/40 border-border/40 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
                                        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                                            <div className="p-3 bg-orange-500/10 rounded-xl mb-4 text-orange-500">
                                                <Zap className="size-6 fill-orange-500/20" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-mono text-text-muted uppercase tracking-[0.2em]">Racha de Días</p>
                                                <p className="text-3xl font-black tracking-tighter text-foreground">{streakDays} Días</p>
                                            </div>
                                            <Zap className="size-4 text-orange-500 inline-block ml-2 animate-bounce" />
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-surface-dark/40 border-border/40 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
                                        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                                            <div className="p-3 bg-accent-blue/10 rounded-xl mb-4 text-accent-blue">
                                                <BarChart3 className="size-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-mono text-text-muted uppercase tracking-[0.2em]">Total XP</p>
                                                <div className="flex items-center justify-center gap-2">
                                                    <p className="text-3xl font-black tracking-tighter text-foreground">{globalXp.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-surface-dark/40 border-border/40 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
                                        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                                            <div className="p-3 bg-emerald-500/10 rounded-xl mb-4 text-emerald-500">
                                                <Target className="size-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-mono text-text-muted uppercase tracking-[0.2em]">Actividades Activas</p>
                                                <p className="text-3xl font-black tracking-tighter text-foreground">{activeSubmissionsCount}</p>
                                            </div>
                                            <span className="size-2 rounded-full bg-emerald-500 inline-block ml-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Badges Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Medal className="size-5 text-orange-500" />
                                        <h3 className="text-xl font-black tracking-tight uppercase">Insignias</h3>
                                    </div>
                                    <div className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
                                        Total Desbloqueadas: <span className="text-foreground font-bold">{earnedBadgesCount}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    {badges.map((badge, idx) => (
                                        <Card
                                            key={idx}
                                            className={cn(
                                                "bg-surface-dark/40 border-border/40 backdrop-blur-sm hover:border-primary transition-all duration-300 group cursor-pointer",
                                                !badge.unlocked && "opacity-60 saturate-[0.2] border-dashed border-border/20"
                                            )}
                                        >
                                            <CardContent className="p-5 flex flex-col items-center gap-4">
                                                <div className={cn(
                                                    "size-14 rounded-2xl flex items-center justify-center transition-all duration-500 overflow-hidden",
                                                    badge.unlocked ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(37,99,235,0.15)] group-hover:rotate-12" : "bg-muted text-muted-foreground saturate-[0.1]"
                                                )}>
                                                    {badge.iconUrl ? (
                                                        <img src={badge.iconUrl} alt={badge.name} className="size-full object-cover" />
                                                    ) : (
                                                        <Medal className="size-7" />
                                                    )}
                                                </div>
                                                <div className="w-full space-y-2 text-center">
                                                    <h4 className="text-xs font-bold leading-tight">{badge.name}</h4>
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex justify-between text-[8px] font-mono uppercase tracking-tighter text-text-muted">
                                                            <span>Maestría</span>
                                                            <span className={cn(badge.unlocked && "text-primary font-black")}>{badge.progress}%</span>
                                                        </div>
                                                        <Progress value={badge.progress} className="h-1 bg-muted" />
                                                    </div>
                                                    {badge.unlocked ? (
                                                        <Badge variant="outline" className="text-[8px] font-mono border-emerald-500/30 text-emerald-500 py-0 px-1.5 h-4 gap-1">
                                                            <CheckCircle2 className="size-2.5" /> INSIGNIA DESBLOQUEADA
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[8px] font-mono border-border/40 text-text-muted py-0 px-1.5 h-4 gap-1">
                                                            <LockIcon className="size-2.5" /> BLOQUEADO
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                            <Separator className="bg-border/20" />
                        </TabsContent>
                    )}

                    <TabsContent value="settings" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Form Section */}
                            <div className="lg:col-span-8 space-y-8">
                                <Card className="bg-surface-dark/40 border-border/40 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                            <Settings2 className="size-5 text-primary" />
                                            Configuración de Cuenta
                                        </CardTitle>
                                        <CardDescription>Gestiona tus datos personales y conexión de servicios.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSave} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-mono uppercase tracking-widest text-text-muted flex items-center gap-2">
                                                        <User className="size-3" /> {isClassroomStudent ? "Identificador" : "Nombre completo"}
                                                    </label>
                                                    <Input
                                                        value={fullName}
                                                        onChange={(e) => !isClassroomStudent && setFullName(e.target.value)}
                                                        readOnly={isClassroomStudent}
                                                        placeholder="Tu nombre completo"
                                                        className={cn(
                                                            "font-mono text-sm",
                                                            isClassroomStudent
                                                                ? "bg-muted/30 border-border/40 opacity-60 cursor-not-allowed"
                                                                : "bg-surface/50 border-border/40 focus:border-primary/50 focus:ring-primary/20 transition-all"
                                                        )}
                                                    />
                                                    {isClassroomStudent && (
                                                        <p className="text-[10px] font-mono text-muted-foreground">
                                                            Tu identificador es asignado por el profesor y no puede modificarse.
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-mono uppercase tracking-widest text-text-muted flex items-center gap-2">
                                                        <Mail className="size-3" /> Email Principal
                                                    </label>
                                                    <Input
                                                        value={userEmail}
                                                        disabled
                                                        className="bg-muted/30 border-border/40 font-mono text-sm opacity-60"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-mono uppercase tracking-widest text-text-muted flex items-center gap-2">
                                                    <Mail className="size-3 text-red-500" /> Email de Google
                                                </label>
                                                <p className="text-[10px] text-text-muted">
                                                    NECESARIO PARA RECIBIR COPIAS DE TRABAJO AUTOMÁTICAS. PUEDE SER GMAIL O GOOGLE WORKSPACE, PERO DEBE COINCIDIR CON LA CUENTA QUE USARÁ EL ALUMNO.
                                                </p>
                                                <Input
                                                    value={googleEmail}
                                                    onChange={(e) => setGoogleEmail(e.target.value)}
                                                    type="email"
                                                    placeholder="tu@centro.es"
                                                    className="bg-surface/50 border-border/40 focus:border-primary/50 focus:ring-primary/20 transition-all font-mono text-sm"
                                                />
                                            </div>

                                            <Button type="submit" disabled={isPending} className="w-full bg-primary hover:bg-primary-hover font-mono uppercase text-xs tracking-[0.2em] h-11">
                                                {isPending ? "Ejecutando actualización..." : "Guardar cambios en el sistema"}
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>

                                {/* Teacher Drive section */}
                                {isTeacher && (
                                    <Card className="bg-surface-dark/40 border-border/40 border-l-4 border-l-accent-blue backdrop-blur-sm">
                                        <CardHeader>
                                            <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                                <HardDrive className="size-5 text-accent-blue" />
                                                Google Drive del Profesor
                                            </CardTitle>
                                            <CardDescription>Habilitar la distribución de plantillas para tus alumnos.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <p className="text-sm text-text-muted leading-relaxed">
                                                Conecta tu cuenta de Google Drive para que el sistema pueda clonar recursos para cada alumno
                                                garantizando la privacidad y el control de accesos de forma automática.
                                            </p>

                                            {isDriveConnected ? (
                                                <div className="flex items-center justify-between gap-4 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                                    <div className="flex items-center gap-3 text-emerald-500 font-mono text-xs font-bold">
                                                        <div className="size-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                                            <CheckCircle2 className="size-4" />
                                                        </div>
                                                        SISTEMA CONECTADO CORRECTAMENTE
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={isDisconnecting}
                                                        onClick={() => {
                                                            startDisconnect(async () => {
                                                                const result = await disconnectDrive();
                                                                if (result.error) {
                                                                    toast.error(result.error);
                                                                } else {
                                                                    toast.success("Drive desconectado.");
                                                                    setCurrentDriveStatus(DRIVE_CONNECTION_STATUS.DISCONNECTED);
                                                                }
                                                            });
                                                        }}
                                                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 font-mono text-[10px] uppercase shrink-0"
                                                    >
                                                        {isDisconnecting ? "Desconectando..." : "Desconectar"}
                                                    </Button>
                                                </div>
                                            ) : isDriveInvalid ? (
                                                <div className="space-y-4 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                                                    <div className="flex items-start gap-3 text-amber-400 font-mono text-xs font-bold">
                                                        <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                                                            <AlertTriangle className="size-4" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p>CONEXIÓN DE GOOGLE DRIVE NO VÁLIDA</p>
                                                            <p className="text-[11px] font-normal text-amber-200/80 leading-relaxed normal-case">
                                                                El access token se renueva solo. Si estás viendo este estado, el problema real es que Google revocó la conexión o el refresh token ya no es utilizable. Reconecta Drive para restaurar copias y subidas.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-3">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={isDisconnecting}
                                                            onClick={() => {
                                                                startDisconnect(async () => {
                                                                    const result = await disconnectDrive();
                                                                    if (result.error) {
                                                                        toast.error(result.error);
                                                                    } else {
                                                                        toast.success("Token inválido eliminado.");
                                                                        setCurrentDriveStatus(DRIVE_CONNECTION_STATUS.DISCONNECTED);
                                                                    }
                                                                });
                                                            }}
                                                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 font-mono text-[10px] uppercase shrink-0"
                                                        >
                                                            {isDisconnecting ? "Limpiando..." : "Eliminar conexión rota"}
                                                        </Button>
                                                        <a href="/api/drive/authorize" className="block">
                                                            <Button variant="outline" className="gap-2 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-mono text-[10px] tracking-widest uppercase">
                                                                <HardDrive className="size-4" />
                                                                Reconectar Drive
                                                            </Button>
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : (
                                                <a href="/api/drive/authorize" className="block">
                                                    <Button variant="outline" className="w-full gap-2 border-accent-blue/40 text-accent-blue hover:bg-accent-blue/10 font-mono text-[10px] tracking-widest uppercase">
                                                        <HardDrive className="size-4" />
                                                        Autorizar Acceso a Drive
                                                    </Button>
                                                </a>
                                            )}

                                            {isDriveConnected && (
                                                <div className="space-y-4 rounded-xl border border-border/40 bg-background/30 p-4">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-mono uppercase tracking-widest text-text-muted">
                                                            Destino de almacenamiento
                                                        </p>
                                                        <p className="text-sm text-text-muted leading-relaxed">
                                                            Decide si Aula-it crea automáticamente la carpeta raíz o si debe guardar dentro de una carpeta concreta, incluso una carpeta compartida del centro.
                                                        </p>
                                                    </div>

                                                    <div className="rounded-xl border border-border/40 bg-surface/40 p-4">
                                                        <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                                                            Modo actual
                                                        </p>
                                                        <p className="mt-1 text-sm font-bold text-foreground">
                                                            {isAutomaticDriveFolder ? "Aula-it Entregas (automática)" : driveFolderLabel}
                                                        </p>
                                                        <p className="mt-1 text-[11px] text-text-muted leading-relaxed">
                                                            {isAutomaticDriveFolder
                                                                ? "El sistema crea o reutiliza la carpeta 'Aula-it Entregas' en la raíz del Drive conectado."
                                                                : "La carpeta seleccionada actúa como raíz contenedora y dentro se seguirá creando la jerarquía de módulo, unidad, actividad y paso."}
                                                        </p>
                                                        {driveStorageSettings.folderUrl && (
                                                            <a
                                                                href={driveStorageSettings.folderUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="mt-3 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-accent-blue hover:text-accent-blue/80"
                                                            >
                                                                <ExternalLink className="size-3" />
                                                                Abrir carpeta base
                                                            </a>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-3 md:flex-row">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            disabled={isSavingDriveSettings || isDrivePickerLoading || isAutomaticDriveFolder}
                                                            onClick={handleUseAutomaticDriveFolder}
                                                            className="flex-1 border-border/40 font-mono text-[10px] uppercase tracking-widest"
                                                        >
                                                            {isSavingDriveSettings ? "Guardando..." : "Usar carpeta automática"}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            disabled={isSavingDriveSettings || isDrivePickerLoading}
                                                            onClick={handleSelectDriveFolder}
                                                            className="flex-1 gap-2 border-accent-blue/40 text-accent-blue hover:bg-accent-blue/10 font-mono text-[10px] uppercase tracking-widest"
                                                        >
                                                            <FolderOpen className="size-4" />
                                                            {isDrivePickerLoading ? "Abriendo Drive..." : "Elegir carpeta de Drive"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {/* Sidebar Settings */}
                            <div className="lg:col-span-4 space-y-6">
                                <Card className="bg-surface-dark/40 border-border/40 backdrop-blur-sm overflow-hidden border-t-4 border-t-primary">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex justify-between items-center">
                                            Avatar de Sistema
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-center gap-6">
                                        <Avatar className="size-24 border-4 border-background shadow-xl ring-2 ring-border/20">
                                            <AvatarImage src={userAvatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${fullName}`} />
                                            <AvatarFallback>{fullName.slice(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        <Button variant="outline" size="sm" className="w-full gap-2 font-mono text-[10px] uppercase tracking-widest hidden">
                                            <Edit2 className="size-3" /> Cambiar Icono
                                        </Button>
                                        <p className="text-[9px] text-center text-text-muted leading-tight uppercase font-mono mt-2">
                                            El avatar es generado dinámicamente basado en tu identidad.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Privacy Card */}
                                <Card className={cn(
                                    "bg-surface-dark/40 border-border/40 backdrop-blur-sm border-l-4 transition-colors",
                                    !isPrivate ? "border-l-emerald-500/40" : "border-l-text-muted/40"
                                )}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                            {isPrivate ? <Eye className="size-3 opacity-50" /> : <Eye className="size-3 text-emerald-500" />}
                                            Privacidad en Ranking
                                        </CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-mono">
                                            {isPrivate ? "Apareces con nombre anónimo" : "Apareces con tu nombre real"}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-mono uppercase text-text-muted">Perfil Público</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newValue = !isPrivate;
                                                    setIsPrivate(newValue);
                                                    startTransition(async () => {
                                                        const result = await updateProfile({ fullName, googleEmail, isPrivate: newValue });
                                                        if (result.error) toast.error("Error al actualizar privacidad");
                                                        else toast.success(newValue ? "Modo anónimo activado" : "Modo público activado");
                                                    });
                                                }}
                                                className={cn(
                                                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                                                    !isPrivate ? "bg-emerald-500" : "bg-muted"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                        !isPrivate ? "translate-x-4" : "translate-x-0"
                                                    )}
                                                />
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
