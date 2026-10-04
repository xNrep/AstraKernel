(function (Scratch) {
    "use strict";

    // ============================================================
    // ASTRA KERNEL & BOOT API
    // Version 3.3.0
    // ============================================================

    const EXT_ID = "astraKernel";

    const BlockType = Scratch.BlockType;
    const ArgumentType = Scratch.ArgumentType;

    // ============================================================
    // ICONS
    // Lucide-style SVG icons
    // ============================================================

    function svgIcon(paths) {
        return "data:image/svg+xml," + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg"
                width="24" height="24" viewBox="0 0 24 24"
                fill="none" stroke="white" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                ${paths}
            </svg>`
        );
    }

    const ASTRA_ICONS = {

        database: svgIcon(`
            <ellipse cx="12" cy="5" rx="8" ry="3"/>
            <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/>
            <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>
        `),

        cpu: svgIcon(`
            <rect x="4" y="4" width="16" height="16" rx="2"/>
            <rect x="8" y="8" width="8" height="8"/>
            <path d="M9 1v3"/>
            <path d="M15 1v3"/>
            <path d="M9 20v3"/>
            <path d="M15 20v3"/>
            <path d="M20 9h3"/>
            <path d="M20 14h3"/>
            <path d="M1 9h3"/>
            <path d="M1 14h3"/>
        `),

        panic: svgIcon(`
            <path d="M12 3L2 21h20L12 3z"/>
            <path d="M12 9v4"/>
            <path d="M12 17h.01"/>
        `),

        bug: svgIcon(`
            <rect x="8" y="7" width="8" height="13" rx="4"/>
            <path d="M9 3h6"/>
            <path d="M12 3v4"/>
            <path d="M4 11h4"/>
            <path d="M16 11h4"/>
            <path d="M4 16h4"/>
            <path d="M16 16h4"/>
            <path d="M7 20l-2 2"/>
            <path d="M17 20l2 2"/>
            <path d="M7 7L5 5"/>
            <path d="M17 7l2-2"/>
        `),

        folder: svgIcon(`
            <path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H3z"/>
            <path d="M3 6a2 2 0 0 1 2-2h4l2 2"/>
        `),

        syscall: svgIcon(`
            <path d="M4 6h16"/>
            <path d="M4 12h16"/>
            <path d="M4 18h16"/>
            <path d="M8 4l-2 2 2 2"/>
            <path d="M16 10l2 2-2 2"/>
            <path d="M8 16l-2 2 2 2"/>
        `),

        terminal: svgIcon(`
            <polyline points="4 6 10 12 4 18"/>
            <line x1="12" y1="18" x2="20" y2="18"/>
        `),

        logs: svgIcon(`
            <path d="M5 4h14v16H5z"/>
            <path d="M8 8h8"/>
            <path d="M8 12h8"/>
            <path d="M8 16h5"/>
        `),

        workflow: svgIcon(`
            <rect x="3" y="3" width="6" height="6" rx="1"/>
            <rect x="15" y="15" width="6" height="6" rx="1"/>
            <rect x="15" y="3" width="6" height="6" rx="1"/>
            <path d="M9 6h6"/>
            <path d="M18 9v6"/>
            <path d="M6 9v5a3 3 0 0 0 3 3h6"/>
        `),

        power: svgIcon(`
            <path d="M12 2v10"/>
            <path d="M18.4 6.6a8 8 0 1 1-12.8 0"/>
        `),

        shield: svgIcon(`
            <path d="M12 3l8 3v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/>
            <path d="M9 12l2 2 4-4"/>
        `)
    };

    // ============================================================
    // DEFAULT PVRAM
    // ============================================================

    const DEFAULT_PVRAM = {
        boot: {
            defaultOS: "ASTRAOS",
            defaultKernel: "astra-kernel",
            timeout: 3,
            safeMode: false,
            verbose: false
        },

        kernel: {
            debug: false,
            hostname: "astra",
            logLevel: "INFO",
            panicMode: "halt",
            lastCrash: ""
        },

        graphics: {
            enabled: true,
            resolution: "480x360",
            fullscreen: false
        },

        audio: {
            enabled: true
        },

        network: {
            enabled: false
        },

        security: {
            lockdown: false
        },

        system: {
            language: "en",
            animations: true,
            darkmode: true
        },

        extensions: {},

        custom: {}
    };

    // ============================================================
    // UTILS
    // ============================================================

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function deepMerge(target, source) {
        if (!source || typeof source !== "object") return target;

        for (const key of Object.keys(source)) {
            const value = source[key];

            if (
                value &&
                typeof value === "object" &&
                !Array.isArray(value)
            ) {
                if (
                    !target[key] ||
                    typeof target[key] !== "object" ||
                    Array.isArray(target[key])
                ) {
                    target[key] = {};
                }

                deepMerge(target[key], value);
            } else {
                target[key] = value;
            }
        }

        return target;
    }

    function normalizeName(value) {
        return String(value ?? "").trim().toLowerCase();
    }

    function deepGet(obj, path) {
        if (!path) return obj;

        const parts = String(path)
            .split(".")
            .filter(Boolean);

        let value = obj;

        for (const part of parts) {
            if (
                value === null ||
                value === undefined ||
                typeof value !== "object"
            ) {
                return undefined;
            }

            value = value[part];
        }

        return value;
    }

    function deepSet(obj, path, value) {
        const parts = String(path)
            .split(".")
            .filter(Boolean);

        if (!parts.length) return;

        let target = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];

            if (
                !target[part] ||
                typeof target[part] !== "object"
            ) {
                target[part] = {};
            }

            target = target[part];
        }

        target[parts[parts.length - 1]] = value;
    }

    function deepDelete(obj, path) {
        const parts = String(path)
            .split(".")
            .filter(Boolean);

        if (!parts.length) return false;

        let target = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            if (!target || typeof target !== "object") {
                return false;
            }

            target = target[parts[i]];
        }

        if (
            target &&
            Object.prototype.hasOwnProperty.call(
                target,
                parts[parts.length - 1]
            )
        ) {
            delete target[parts[parts.length - 1]];
            return true;
        }

        return false;
    }

    function safeJSON(value) {
        try {
            return JSON.stringify(value);
        } catch {
            return "{}";
        }
    }

    function nowISO() {
        return new Date().toISOString();
    }

    function generateID(prefix) {
        return (
            prefix +
            "-" +
            Date.now().toString(36).toUpperCase() +
            "-" +
            Math.random()
                .toString(36)
                .slice(2, 7)
                .toUpperCase()
        );
    }

    // ============================================================
    // ASTRA KERNEL
    // ============================================================

    class ASTRAKernel {

        constructor() {

            this.kernel = {
                name: "ASTRA Kernel",
                id: "astra-kernel",
                version: "3.3.0",
                state: "RUNNING",
                os: "ASTRAOS",
                startTime: Date.now()
            };

            this.logs = [];

            this.lastCommandResult = "";

            this.lastSyscall = "";
            this.lastSyscallResult = "";

            this.currentOS = "ASTRAOS";
            this.currentKernel = "astra-kernel";

            this.nextPID = 2;

            this.processes = [
                {
                    pid: 0,
                    name: "init",
                    type: "system",
                    state: "RUNNING",
                    createdAt: nowISO(),
                    startedAt: nowISO(),
                    restarts: 0,
                    launches: 0,
                    lastLaunchAt: null
                },
                {
                    pid: 1,
                    name: "kernel",
                    type: "kernel",
                    state: "RUNNING",
                    createdAt: nowISO(),
                    startedAt: nowISO(),
                    restarts: 0,
                    launches: 0,
                    lastLaunchAt: null
                }
            ];

            // Process scripts are attached to the Scratch hat:
            // "process [NAME]". Launching a process starts every
            // matching process script, allowing one process to own
            // multiple scripts.
            this.lastProcessLaunch = null;

            this.panic = null;
            this.panicScreen = null;

            this.pvram = this.loadPVRAM();

            this.crashes = this.loadCrashes();

            this.commands = {};
            this.syscalls = {};

            this.registerCommands();
            this.registerSyscalls();

            this.log(
                "INFO",
                "ASTRA Kernel initialized"
            );
        }

        // ========================================================
        // STORAGE
        // ========================================================

        storageGet(key) {
            try {
                return localStorage.getItem(key);
            } catch {
                return null;
            }
        }

        storageSet(key, value) {
            try {
                localStorage.setItem(key, value);
            } catch {}
        }

        // ========================================================
        // PVRAM
        // ========================================================

        loadPVRAM() {

            const raw = this.storageGet(
                "ASTRAOS_PVRAM"
            );

            if (!raw) {
                const defaults = clone(DEFAULT_PVRAM);

                this.storageSet(
                    "ASTRAOS_PVRAM",
                    safeJSON(defaults)
                );

                return defaults;
            }

            try {

                const parsed = JSON.parse(raw);

                return deepMerge(
                    clone(DEFAULT_PVRAM),
                    parsed
                );

            } catch {

                return clone(DEFAULT_PVRAM);
            }
        }

        savePVRAM() {

            this.storageSet(
                "ASTRAOS_PVRAM",
                safeJSON(this.pvram)
            );

            return true;
        }

        pvramGet(args) {

            const path = String(
                args.PATH || ""
            );

            const value = deepGet(
                this.pvram,
                path
            );

            if (value === undefined) {
                return "";
            }

            if (
                typeof value === "object"
            ) {
                return safeJSON(value);
            }

            return String(value);
        }

        pvramSet(args) {

            const path = String(
                args.PATH || ""
            );

            let value = args.VALUE;

            const raw = String(value);

            if (raw === "true") {
                value = true;
            } else if (raw === "false") {
                value = false;
            } else if (
                raw !== "" &&
                !isNaN(raw)
            ) {
                value = Number(raw);
            } else {
                try {
                    value = JSON.parse(raw);
                } catch {
                    value = raw;
                }
            }

            deepSet(
                this.pvram,
                path,
                value
            );

            this.savePVRAM();

            this.log(
                "INFO",
                `PVRAM SET ${path}`
            );

            return true;
        }

        pvramExists(args) {

            return (
                deepGet(
                    this.pvram,
                    String(args.PATH || "")
                ) !== undefined
            );
        }

        pvramDelete(args) {

            const result = deepDelete(
                this.pvram,
                String(args.PATH || "")
            );

            this.savePVRAM();

            return result;
        }

        pvramJSON() {
            return safeJSON(this.pvram);
        }

        pvramReset() {

            this.pvram = clone(
                DEFAULT_PVRAM
            );

            this.savePVRAM();

            this.log(
                "WARNING",
                "PVRAM reset"
            );

            return true;
        }

        // ========================================================
        // KERNEL
        // ========================================================

        kernelVersion() {
            return this.kernel.version;
        }

        kernelName() {
            return this.kernel.name;
        }

        kernelState() {
            return this.kernel.state;
        }

        kernelUptime() {

            return Math.floor(
                (Date.now() -
                    this.kernel.startTime) /
                    1000
            );
        }

        kernelInfo() {

            return safeJSON({
                name: this.kernel.name,
                id: this.kernel.id,
                version: this.kernel.version,
                state: this.kernel.state,
                os: this.currentOS,
                uptime: this.kernelUptime(),
                unsandboxed:
                    this.isUnsandboxed()
            });
        }

        kernelReboot() {

            this.log(
                "WARNING",
                "Kernel reboot requested"
            );

            this.kernel.state =
                "REBOOTING";

            setTimeout(() => {

                this.kernel.startTime =
                    Date.now();

                this.kernel.state =
                    "RUNNING";

                this.panic = null;

                this.removePanicScreen();

                this.log(
                    "INFO",
                    "Kernel reboot complete"
                );

            }, 100);

            return true;
        }

        kernelShutdown() {

            this.kernel.state =
                "HALTED";

            this.log(
                "WARNING",
                "Kernel shutdown"
            );

            return true;
        }

        // ========================================================
        // KERNEL PANIC
        // ========================================================

        kernelPanic(args) {

            if (this.panic) {
                return this.panic.id;
            }

            const reason =
                String(
                    args.REASON ||
                    "Unknown kernel failure"
                );

            const id =
                generateID("PANIC");

            this.panic = {

                id,

                code: "ASTRA_KERNEL_PANIC",

                reason,

                os: this.currentOS,

                kernel: this.kernel.name,

                version: this.kernel.version,

                uptime: this.kernelUptime(),

                timestamp: nowISO(),

                state: "PANIC",

                logs: clone(this.logs),

                processes:
                    clone(this.processes)
            };

            this.kernel.state =
                "PANIC";

            this.pvram.kernel.lastCrash =
                id;

            this.savePVRAM();

            this.crashes.unshift(
                this.panic
            );

            if (this.crashes.length > 50) {
                this.crashes =
                    this.crashes.slice(0, 50);
            }

            this.saveCrashes();

            this.log(
                "PANIC",
                reason
            );

            this.showPanicScreen();

            try {

                if (
                    this.runtime &&
                    this.runtime.startHats
                ) {
                    this.runtime.startHats(
                        EXT_ID +
                        "_whenKernelPanic"
                    );
                }

            } catch {}

            return id;
        }

        panicState() {
            return !!this.panic;
        }

        panicID() {
            return this.panic
                ? this.panic.id
                : "";
        }

        panicCode() {
            return this.panic
                ? this.panic.code
                : "";
        }

        panicReason() {
            return this.panic
                ? this.panic.reason
                : "";
        }

        panicTimestamp() {
            return this.panic
                ? this.panic.timestamp
                : "";
        }

        panicUptime() {
            return this.panic
                ? this.panic.uptime
                : 0;
        }

        panicReport() {
            return this.panic
                ? safeJSON(this.panic)
                : "";
        }

        panicJSON() {
            return this.panic
                ? safeJSON(this.panic)
                : "{}";
        }

        clearPanic() {

            this.panic = null;

            this.removePanicScreen();

            if (
                this.kernel.state ===
                "PANIC"
            ) {
                this.kernel.state =
                    "RUNNING";
            }

            return true;
        }

        // ========================================================
        // PANIC SCREEN
        // ========================================================

        showPanicScreen() {

            if (
                typeof document ===
                "undefined"
            ) {
                return;
            }

            this.removePanicScreen();

            const p =
                this.panic;

            const overlay =
                document.createElement(
                    "div"
                );

            overlay.id =
                "astra-kernel-panic";

            overlay.style.cssText = `
                position:fixed;
                inset:0;
                z-index:2147483647;
                background:#080808;
                color:#fff;
                font-family:monospace;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:24px;
                box-sizing:border-box;
            `;

            overlay.innerHTML = `

                <div style="
                    width:min(900px,100%);
                    border:2px solid #ff3333;
                    padding:24px;
                    box-sizing:border-box;
                    background:#0d0d0d;
                    box-shadow:
                        0 0 30px rgba(255,0,0,.25);
                ">

                    <div style="
                        color:#ff3333;
                        font-size:28px;
                        font-weight:bold;
                        margin-bottom:20px;
                    ">
                        ASTRAOS KERNEL PANIC
                    </div>

                    <div style="
                        margin-bottom:20px;
                        color:#aaa;
                    ">
                        The kernel encountered
                        an unrecoverable error.
                    </div>

                    <pre style="
                        white-space:pre-wrap;
                        line-height:1.6;
                        font-size:14px;
                    ">PANIC ID : ${p.id}
CODE     : ${p.code}
REASON   : ${p.reason}
OS       : ${p.os}
KERNEL   : ${p.kernel}
VERSION  : ${p.version}
UPTIME   : ${p.uptime}s
TIME     : ${p.timestamp}</pre>

                    <div style="
                        display:flex;
                        gap:10px;
                        margin-top:25px;
                    ">

                        <button id="astra-panic-reboot"
                            style="
                                padding:10px 18px;
                                background:#222;
                                color:white;
                                border:1px solid #555;
                                cursor:pointer;
                            ">
                            REBOOT
                        </button>

                        <button id="astra-panic-shutdown"
                            style="
                                padding:10px 18px;
                                background:#300;
                                color:white;
                                border:1px solid #900;
                                cursor:pointer;
                            ">
                            SHUTDOWN
                        </button>

                    </div>

                </div>
            `;

            document.body.appendChild(
                overlay
            );

            const reboot =
                overlay.querySelector(
                    "#astra-panic-reboot"
                );

            const shutdown =
                overlay.querySelector(
                    "#astra-panic-shutdown"
                );

            reboot.onclick = () => {

                this.removePanicScreen();

                this.kernel.state =
                    "REBOOTING";

                setTimeout(() => {

                    this.kernel.startTime =
                        Date.now();

                    this.kernel.state =
                        "RUNNING";

                    this.panic = null;

                }, 100);
            };

            shutdown.onclick = () => {

                this.kernel.state =
                    "HALTED";

                if (reboot) {
                    reboot.disabled = true;
                }

                shutdown.textContent =
                    "SYSTEM HALTED";
            };

            this.panicScreen =
                overlay;
        }

        removePanicScreen() {

            if (
                this.panicScreen &&
                this.panicScreen.parentNode
            ) {
                this.panicScreen.parentNode
                    .removeChild(
                        this.panicScreen
                    );
            }

            this.panicScreen = null;
        }

        // ========================================================
        // CRASH STORAGE
        // ========================================================

        loadCrashes() {

            const raw =
                this.storageGet(
                    "ASTRAOS_CRASHES"
                );

            if (!raw) return [];

            try {
                return JSON.parse(raw);
            } catch {
                return [];
            }
        }

        saveCrashes() {