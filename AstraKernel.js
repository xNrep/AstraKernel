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

            this.storageSet(
                "ASTRAOS_CRASHES",
                safeJSON(this.crashes)
            );
        }

        crashCount() {
            return this.crashes.length;
        }

        crashHistory() {
            return safeJSON(
                this.crashes
            );
        }

        latestCrash() {

            if (!this.crashes.length) {
                return "";
            }

            return safeJSON(
                this.crashes[0]
            );
        }

        crashByID(args) {

            const id =
                String(args.ID || "");

            const crash =
                this.crashes.find(
                    x => x.id === id
                );

            return crash
                ? safeJSON(crash)
                : "";
        }

        // ========================================================
        // RXFS BRIDGE
        // ========================================================

        rxFSCrashDirectory() {
            return "/ASTRAOS/crash/";
        }

        rxFSLatestCrashPath() {

            if (!this.crashes.length) {
                return "";
            }

            return (
                this.rxFSCrashDirectory() +
                this.crashes[0].id +
                ".json"
            );
        }

        rxFSLatestCrashData() {

            if (!this.crashes.length) {
                return "";
            }

            return safeJSON(
                this.crashes[0]
            );
        }

        // ========================================================
        // SYSCALLS
        // ========================================================

        registerSyscalls() {

            this.syscalls = {

                "kernel.version":
                    () => this.kernelVersion(),

                "kernel.name":
                    () => this.kernelName(),

                "kernel.state":
                    () => this.kernelState(),

                "kernel.uptime":
                    () => this.kernelUptime(),

                "kernel.os":
                    () => this.currentOS,

                "kernel.info":
                    () => this.kernelInfo(),

                "panic.state":
                    () => this.panicState(),

                "panic.report":
                    () => this.panicJSON(),

                "pvram.get":
                    args => this.pvramGet({
                        PATH: args
                    }),

                "pvram.set":
                    args => {

                        const split =
                            String(args)
                                .split("=");

                        return this.pvramSet({
                            PATH: split[0],
                            VALUE:
                                split.slice(1)
                                    .join("=")
                        });
                    },

                "process.count":
                    () => this.processes.length,

                "process.running":
                    () => this.runningProcessCount(),

                "process.list":
                    () => this.processList(),

                "process.names":
                    () => this.processNames(),

                "kernel.uptime.ms":
                    () => (
                        Date.now() -
                        this.kernel.startTime
                    )
            };
        }

        syscall(args) {

            const name =
                String(args.NAME || "");

            const rawArgs =
                String(args.ARGS || "");

            this.lastSyscall =
                name;

            if (
                !this.syscalls[name]
            ) {

                this.lastSyscallResult =
                    "SYSCALL_NOT_FOUND";

                return this.lastSyscallResult;
            }

            try {

                const result =
                    this.syscalls[name](
                        rawArgs
                    );

                this.lastSyscallResult =
                    typeof result ===
                    "object"
                        ? safeJSON(result)
                        : String(result);

                return this.lastSyscallResult;

            } catch (e) {

                this.lastSyscallResult =
                    "SYSCALL_ERROR: " +
                    e.message;

                return this.lastSyscallResult;
            }
        }

        syscallExists(args) {

            return !!this.syscalls[
                String(args.NAME || "")
            ];
        }

        syscallList() {

            return Object.keys(
                this.syscalls
            ).join("\n");
        }

        syscallLastResult() {
            return this.lastSyscallResult;
        }

        // ========================================================
        // TERMINAL
        // ========================================================

        registerCommands() {

            this.commands = {

                help: () => {

                    return Object.keys(
                        this.commands
                    ).join("  ");
                },

                sysinfo: () =>
                    this.kernelInfo(),

                ps: () =>
                    this.processTable(),

                psl: () =>
                    this.processList(),

                logs: () =>
                    this.logsJSON(),

                pvram: () =>
                    this.pvramJSON(),

                panic: args =>
                    this.kernelPanic({
                        REASON:
                            args.join(" ") ||
                            "Manual panic"
                    }),

                reboot: () =>
                    this.kernelReboot(),

                shutdown: () =>
                    this.kernelShutdown()
            };
        }

        parseCommandString(command) {

            const tokens = [];

            let current = "";

            let quote = null;

            let escaped = false;

            for (
                let i = 0;
                i < command.length;
                i++
            ) {

                const char =
                    command[i];

                if (escaped) {

                    current += char;

                    escaped = false;

                    continue;
                }

                if (char === "\\") {

                    escaped = true;

                    continue;
                }

                if (
                    quote &&
                    char === quote
                ) {

                    quote = null;

                    continue;
                }

                if (
                    !quote &&
                    (
                        char === '"' ||
                        char === "'"
                    )
                ) {

                    quote = char;

                    continue;
                }

                if (
                    !quote &&
                    /\s/.test(char)
                ) {

                    if (current) {

                        tokens.push(
                            current
                        );

                        current = "";
                    }

                    continue;
                }

                current += char;
            }

            if (current) {
                tokens.push(current);
            }

            return tokens;
        }

        executeCommand(args) {

            const command =
                String(
                    args.COMMAND || ""
                ).trim();

            const tokens =
                this.parseCommandString(
                    command
                );

            if (!tokens.length) {
                return "";
            }

            const name =
                tokens.shift()
                    .toLowerCase();

            if (!this.commands[name]) {

                this.lastCommandResult =
                    `Unknown command: ${name}`;

                return this.lastCommandResult;
            }

            try {

                const result =
                    this.commands[name](
                        tokens
                    );

                this.lastCommandResult =
                    typeof result ===
                    "object"
                        ? safeJSON(result)
                        : String(result);

                return this.lastCommandResult;

            } catch (e) {

                this.lastCommandResult =
                    "Command error: " +
                    e.message;

                return this.lastCommandResult;
            }
        }

        parseCommand(args) {

            return safeJSON(
                this.parseCommandString(
                    String(
                        args.COMMAND || ""
                    )
                )
            );
        }

        lastCommand() {
            return this.lastCommandResult;
        }

        // ========================================================
        // LOGGING
        // ========================================================

        log(level, message) {

            const entry = {

                timestamp: nowISO(),

                level:

                    String(level)
                        .toUpperCase(),

                message:
                    String(message)
            };

            this.logs.push(entry);

            if (this.logs.length > 200) {
                this.logs.shift();
            }

            return true;
        }

        logInfo(args) {
            return this.log(
                "INFO",
                args.MESSAGE
            );
        }

        logDebug(args) {
            return this.log(
                "DEBUG",
                args.MESSAGE
            );
        }

        logWarning(args) {
            return this.log(
                "WARNING",
                args.MESSAGE
            );
        }

        logError(args) {
            return this.log(
                "ERROR",
                args.MESSAGE
            );
        }

        logsJSON() {
            return safeJSON(
                this.logs
            );
        }

        clearLogs() {

            this.logs = [];

            return true;
        }

        // ========================================================
        // PROCESS MANAGER
        // ========================================================

        findProcessByName(args) {

            const wanted =
                normalizeName(args.NAME);

            if (!wanted) return null;

            return (
                this.processes.find(
                    process =>
                        normalizeName(process.name) ===
                        wanted
                ) || null
            );
        }

        processExists(args) {
            return !!this.findProcessByName(args);
        }

        processIsRunning(args) {

            const process =
                this.findProcessByName(args);

            return !!(
                process &&
                process.state === "RUNNING"
            );
        }

        processIsStopped(args) {

            const process =
                this.findProcessByName(args);

            return !!(
                process &&
                process.state !== "RUNNING"
            );
        }

        processStateByName(args) {

            const process =
                this.findProcessByName(args);

            return process
                ? process.state
                : "NOT_FOUND";
        }

        processPIDByName(args) {

            const process =
                this.findProcessByName(args);

            return process
                ? process.pid
                : -1;
        }

        processTypeByName(args) {

            const process =
                this.findProcessByName(args);

            return process
                ? process.type
                : "";
        }

        processInfoByName(args) {

            const process =
                this.findProcessByName(args);

            return process
                ? safeJSON(process)
                : "";
        }

        createProcessBlock(args) {

            const name =
                String(
                    args.NAME || "process"
                ).trim() || "process";

            const type =
                String(
                    args.TYPE || "user"
                ).trim() || "user";

            const process = {

                pid: this.nextPID++,

                name,

                type,

                state:
                    "RUNNING",

                createdAt:
                    nowISO(),

                startedAt:
                    nowISO(),

                restarts: 0,

                launches: 0,

                lastLaunchAt: null
            };

            this.processes.push(
                process
            );

            this.log(
                "INFO",
                `Process created: ${process.name} [${process.pid}]`
            );

            return process.pid;
        }

        killProcess(args) {

            const pid =
                Number(args.PID);

            const process =
                this.processes.find(
                    p => p.pid === pid
                );

            if (!process) {
                return false;
            }

            if (
                process.pid === 0 ||
                process.pid === 1
            ) {
                return false;
            }

            process.state =
                "TERMINATED";

            this.processes =
                this.processes.filter(
                    p => p.pid !== pid
                );

            this.log(
                "INFO",
                `Process killed: ${process.name} [${pid}]`
            );

            return true;
        }

        killProcessByName(args) {

            const process =
                this.findProcessByName(args);

            if (!process) return false;

            if (
                process.pid === 0 ||
                process.pid === 1
            ) {
                return false;
            }

            process.state =
                "TERMINATED";

            this.processes =
                this.processes.filter(
                    p => p.pid !== process.pid
                );

            this.log(
                "INFO",
                `Process killed: ${process.name} [${process.pid}]`
            );

            return true;
        }

        stopProcessByName(args) {

            const process =
                this.findProcessByName(args);

            if (!process) return false;

            if (
                process.pid === 0 ||
                process.pid === 1
            ) {
                return false;
            }

            if (process.state === "STOPPED") {
                return true;
            }

            process.state =
                "STOPPED";

            this.log(
                "INFO",
                `Process stopped: ${process.name} [${process.pid}]`
            );

            return true;
        }

        resumeProcessByName(args) {

            const process =
                this.findProcessByName(args);

            if (!process) return false;

            process.state =
                "RUNNING";

            this.log(
                "INFO",
                `Process resumed: ${process.name} [${process.pid}]`
            );

            return true;
        }

        restartProcessByName(args) {

            const process =
                this.findProcessByName(args);

            if (!process) return false;

            if (
                process.pid === 0 ||
                process.pid === 1
            ) {
                return false;
            }

            process.state =
                "RESTARTING";

            process.restarts =
                Number(process.restarts || 0) + 1;

            process.startedAt =
                nowISO();

            process.state =
                "RUNNING";

            this.log(
                "INFO",
                `Process restarted: ${process.name} [${process.pid}]`
            );

            return true;
        }

        launchProcessByName(args) {

            const name =
                String(args.NAME || "").trim();

            if (!name) {
                return false;
            }

            let process =
                this.findProcessByName({
                    NAME: name
                });

            // A process can be declared purely by its
            // "process [NAME]" script. Launching it will
            // automatically register it with the kernel.
            if (!process) {

                this.createProcessBlock({
                    NAME: name,
                    TYPE: "user"
                });

                process =
                    this.findProcessByName({
                        NAME: name
                    });
            }

            if (!process) {
                return false;
            }

            if (
                process.pid !== 0 &&
                process.pid !== 1 &&
                process.state !== "RUNNING"
            ) {
                process.state = "RUNNING";
            }

            process.launches =
                Number(process.launches || 0) + 1;

            process.lastLaunchAt =
                nowISO();

            this.lastProcessLaunch = {
                name: process.name,
                pid: process.pid,
                timestamp: process.lastLaunchAt,
                launchCount: process.launches
            };

            this.log(
                "INFO",
                `Process launched: ${process.name} [${process.pid}]`
            );

            let started = 0;

            try {

                if (
                    this.runtime &&
                    this.runtime.startHats
                ) {
                    const threads =
                        this.runtime.startHats(
                            EXT_ID +
                            "_whenProcessStarts",
                            {
                                NAME:
                                    process.name
                            }
                        );

                    if (Array.isArray(threads)) {
                        started = threads.length;
                    }
                }

            } catch (e) {

                this.log(
                    "ERROR",
                    `Failed to start process ${process.name}: ${e.message}`
                );

                return false;
            }

            this.lastProcessLaunch.startedScripts =
                started;

            return true;
        }

        whenProcessStarts() {
            // Event/hat blocks are triggered by launchProcessByName().
            return true;
        }

        lastProcessLaunchInfo() {
            return this.lastProcessLaunch
                ? safeJSON(this.lastProcessLaunch)
                : "";
        }

        processLaunchCount() {

            return this.processes.reduce(
                (total, process) =>
                    total +
                    Number(process.launches || 0),
                0
            );
        }

        processList() {

            return safeJSON(
                this.processes
            );
        }

        processNames() {

            return this.processes
                .map(
                    process =>
                        process.name
                )
                .join("\n");
        }

        processCount() {

            return this.processes.length;
        }

        runningProcessCount() {

            return this.processes.filter(
                process =>
                    process.state === "RUNNING"
            ).length;
        }

        stoppedProcessCount() {

            return this.processes.filter(
                process =>
                    process.state !== "RUNNING"
            ).length;
        }

        processTable() {

            return this.processes
                .map(
                    process =>
                        `${process.name} [${process.pid}] - ${process.state}`
                )
                .join("\n");
        }

        // ========================================================
        // BOOTLOADER
        // ========================================================

        bootCurrentOS() {
            return this.currentOS;
        }

        bootCurrentKernel() {
            return this.currentKernel;
        }

        bootDefaultOS() {

            return String(
                this.pvram.boot.defaultOS
            );
        }

        bootDefaultKernel() {

            return String(
                this.pvram.boot.defaultKernel
            );
        }

        setDefaultBoot(args) {

            this.pvram.boot.defaultOS =
                String(
                    args.OS || "ASTRAOS"
                );

            this.pvram.boot.defaultKernel =
                String(
                    args.KERNEL ||
                    "astra-kernel"
                );

            this.savePVRAM();

            return true;
        }

        bootOS(args) {

            this.currentOS =
                String(
                    args.OS || "ASTRAOS"
                );

            this.currentKernel =
                String(
                    args.KERNEL ||
                    "astra-kernel"
                );

            this.kernel.state =
                "RUNNING";

            this.log(
                "INFO",
                `Booted ${this.currentOS} / ${this.currentKernel}`
            );

            return true;
        }

        setSafeMode(args) {

            const value =
                String(
                    args.VALUE
                ).toLowerCase() ===
                "true";

            this.pvram.boot.safeMode =
                value;

            this.savePVRAM();

            return true;
        }

        safeMode() {

            return !!this.pvram.boot.safeMode;
        }

        // ========================================================
        // SECURITY / SYSTEM
        // ========================================================

        isUnsandboxed() {

            return (
                Scratch.extensions &&
                Scratch.extensions.unsandboxed === true
            );
        }

        systemInfo() {

            if (
                typeof navigator ===
                "undefined"
            ) {
                return "{}";
            }

            return safeJSON({

                userAgent:
                    navigator.userAgent,

                platform:
                    navigator.platform,

                language:
                    navigator.language,

                online:
                    navigator.onLine,

                cores:
                    navigator.hardwareConcurrency ||
                    0,

                memory:
                    navigator.deviceMemory ||
                    0
            });
        }

        // ========================================================
        // RUNTIME
        // ========================================================

        setRuntime(runtime) {
            this.runtime = runtime;
        }

        // ========================================================
        // BLOCK INFO
        // ========================================================

        getInfo() {

            return {

                id: EXT_ID,

                name: "ASTRA Kernel",

                color1: "#202B45",
                color2: "#162036",
                color3: "#0D1425",

                blockIconURI:
                    ASTRA_ICONS.cpu,

                blocks: [

                    // ==================================================
                    // PVRAM
                    // ==================================================

                    {
                        opcode: "pvramGet",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "PVRAM get [PATH]",
                        blockIconURI:
                            ASTRA_ICONS.database,
                        arguments: {
                            PATH: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "kernel.debug"
                            }
                        }
                    },

                    {
                        opcode: "pvramSet",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "PVRAM set [PATH] to [VALUE]",
                        blockIconURI:
                            ASTRA_ICONS.database,
                        arguments: {
                            PATH: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "kernel.debug"
                            },
                            VALUE: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "true"
                            }
                        }
                    },

                    {
                        opcode: "pvramExists",
                        blockType:
                            BlockType.BOOLEAN,
                        text:
                            "PVRAM has [PATH]?",
                        blockIconURI:
                            ASTRA_ICONS.database,
                        arguments: {
                            PATH: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "kernel.debug"
                            }
                        }
                    },

                    {
                        opcode: "pvramDelete",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "PVRAM delete [PATH]",
                        blockIconURI:
                            ASTRA_ICONS.database,
                        arguments: {
                            PATH: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "custom.test"
                            }
                        }
                    },

                    {
                        opcode: "pvramSave",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "PVRAM save",
                        blockIconURI:
                            ASTRA_ICONS.database
                    },

                    {
                        opcode: "pvramReset",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "PVRAM reset",
                        blockIconURI:
                            ASTRA_ICONS.database
                    },

                    {
                        opcode: "pvramJSON",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "PVRAM JSON",
                        blockIconURI:
                            ASTRA_ICONS.database
                    },

                    // ==================================================
                    // KERNEL
                    // ==================================================

                    {
                        opcode: "kernelVersion",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "kernel version",
                        blockIconURI:
                            ASTRA_ICONS.cpu
                    },

                    {
                        opcode: "kernelName",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "kernel name",
                        blockIconURI:
                            ASTRA_ICONS.cpu
                    },

                    {
                        opcode: "kernelState",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "kernel state",
                        blockIconURI:
                            ASTRA_ICONS.cpu
                    },

                    {
                        opcode: "kernelUptime",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "kernel uptime",
                        blockIconURI:
                            ASTRA_ICONS.cpu
                    },

                    {
                        opcode: "kernelInfo",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "kernel info",
                        blockIconURI:
                            ASTRA_ICONS.cpu
                    },

                    {
                        opcode: "kernelReboot",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "kernel reboot",
                        blockIconURI:
                            ASTRA_ICONS.power
                    },

                    {
                        opcode: "kernelShutdown",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "kernel shutdown",
                        blockIconURI:
                            ASTRA_ICONS.power
                    },

                    // ==================================================
                    // PANIC
                    // ==================================================

                    {
                        opcode:
                            "whenKernelPanic",
                        blockType:
                            BlockType.HAT,
                        text:
                            "when kernel panic",
                        blockIconURI:
                            ASTRA_ICONS.panic
                    },

                    {
                        opcode:
                            "kernelPanic",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "kernel panic [REASON]",
                        blockIconURI:
                            ASTRA_ICONS.panic,
                        arguments: {
                            REASON: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "Manual panic"
                            }
                        }
                    },

                    {
                        opcode:
                            "panicState",
                        blockType:
                            BlockType.BOOLEAN,
                        text:
                            "kernel is in panic?",
                        blockIconURI:
                            ASTRA_ICONS.panic
                    },

                    {
                        opcode:
                            "panicID",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "panic ID",
                        blockIconURI:
                            ASTRA_ICONS.panic
                    },

                    {
                        opcode:
                            "panicCode",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "panic code",
                        blockIconURI:
                            ASTRA_ICONS.panic
                    },

                    {
                        opcode:
                            "panicReason",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "panic reason",
                        blockIconURI:
                            ASTRA_ICONS.panic
                    },

                    {
                        opcode:
                            "panicTimestamp",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "panic timestamp",
                        blockIconURI:
                            ASTRA_ICONS.panic
                    },

                    {
                        opcode:
                            "panicUptime",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "panic uptime",
                        blockIconURI:
                            ASTRA_ICONS.panic
                    },

                    {
                        opcode:
                            "panicReport",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "panic report",
                        blockIconURI:
                            ASTRA_ICONS.panic
                    },

                    {
                        opcode:
                            "panicJSON",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "panic JSON",
                        blockIconURI:
                            ASTRA_ICONS.panic
                    },

                    {
                        opcode:
                            "clearPanic",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "clear kernel panic",
                        blockIconURI:
                            ASTRA_ICONS.panic
                    },

                    // ==================================================
                    // CRASH REPORTS
                    // ==================================================

                    {
                        opcode:
                            "crashCount",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "crash report count",
                        blockIconURI:
                            ASTRA_ICONS.bug
                    },

                    {
                        opcode:
                            "crashHistory",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "crash history",
                        blockIconURI:
                            ASTRA_ICONS.bug
                    },

                    {
                        opcode:
                            "latestCrash",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "latest crash",
                        blockIconURI:
                            ASTRA_ICONS.bug
                    },

                    {
                        opcode:
                            "crashByID",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "crash [ID]",
                        blockIconURI:
                            ASTRA_ICONS.bug,
                        arguments: {
                            ID: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "PANIC-..."
                            }
                        }
                    },

                    // ==================================================
                    // rxFS
                    // ==================================================

                    {
                        opcode:
                            "rxFSCrashDirectory",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "rxFS crash directory",
                        blockIconURI:
                            ASTRA_ICONS.folder
                    },

                    {
                        opcode:
                            "rxFSLatestCrashPath",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "rxFS latest crash path",
                        blockIconURI:
                            ASTRA_ICONS.folder
                    },

                    {
                        opcode:
                            "rxFSLatestCrashData",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "rxFS latest crash data",
                        blockIconURI:
                            ASTRA_ICONS.folder
                    },

                    // ==================================================
                    // SYSCALLS
                    // ==================================================

                    {
                        opcode:
                            "syscall",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "syscall [NAME] args [ARGS]",
                        blockIconURI:
                            ASTRA_ICONS.syscall,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "kernel.version"
                            },
                            ARGS: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    ""
                            }
                        }
                    },

                    {
                        opcode:
                            "syscallExists",
                        blockType:
                            BlockType.BOOLEAN,
                        text:
                            "syscall [NAME] exists?",
                        blockIconURI:
                            ASTRA_ICONS.syscall,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "kernel.version"
                            }
                        }
                    },

                    {
                        opcode:
                            "syscallList",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "syscall list",
                        blockIconURI:
                            ASTRA_ICONS.syscall
                    },

                    {
                        opcode:
                            "syscallLastResult",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "last syscall result",
                        blockIconURI:
                            ASTRA_ICONS.syscall
                    },

                    // ==================================================
                    // TERMINAL
                    // ==================================================

                    {
                        opcode:
                            "executeCommand",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "execute command [COMMAND]",
                        blockIconURI:
                            ASTRA_ICONS.terminal,
                        arguments: {
                            COMMAND: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "sysinfo"
                            }
                        }
                    },

                    {
                        opcode:
                            "parseCommand",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "parse command [COMMAND]",
                        blockIconURI:
                            ASTRA_ICONS.terminal,
                        arguments: {
                            COMMAND: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    'echo "hello world"'
                            }
                        }
                    },

                    {
                        opcode:
                            "lastCommand",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "last command result",
                        blockIconURI:
                            ASTRA_ICONS.terminal
                    },

                    // ==================================================
                    // LOGS
                    // ==================================================

                    {
                        opcode:
                            "logInfo",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "log info [MESSAGE]",
                        blockIconURI:
                            ASTRA_ICONS.logs,
                        arguments: {
                            MESSAGE: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "System started"
                            }
                        }
                    },

                    {
                        opcode:
                            "logDebug",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "log debug [MESSAGE]",
                        blockIconURI:
                            ASTRA_ICONS.logs,
                        arguments: {
                            MESSAGE: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "Debug message"
                            }
                        }
                    },

                    {
                        opcode:
                            "logWarning",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "log warning [MESSAGE]",
                        blockIconURI:
                            ASTRA_ICONS.logs,
                        arguments: {
                            MESSAGE: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "Warning"
                            }
                        }
                    },

                    {
                        opcode:
                            "logError",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "log error [MESSAGE]",
                        blockIconURI:
                            ASTRA_ICONS.logs,
                        arguments: {
                            MESSAGE: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "Error"
                            }
                        }
                    },

                    {
                        opcode:
                            "logsJSON",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "logs JSON",
                        blockIconURI:
                            ASTRA_ICONS.logs
                    },

                    {
                        opcode:
                            "clearLogs",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "clear logs",
                        blockIconURI:
                            ASTRA_ICONS.logs
                    },

                    // ==================================================
                    // PROCESSES
                    // ==================================================

                    {
                        opcode:
                            "createProcessBlock",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "create process [NAME] type [TYPE]",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "myProcess"
                            },
                            TYPE: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "user"
                            }
                        }
                    },

                    {
                        opcode:
                            "killProcess",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "kill process [PID]",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            PID: {
                                type:
                                    ArgumentType.NUMBER,
                                defaultValue:
                                    2
                            }
                        }
                    },

                    {
                        opcode:
                            "processList",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "process list",
                        blockIconURI:
                            ASTRA_ICONS.workflow
                    },

                    {
                        opcode:
                            "processCount",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "process count",
                        blockIconURI:
                            ASTRA_ICONS.workflow
                    },

                    // ==================================================
                    // PROCESS MANAGER
                    // ==================================================

                    {
                        opcode:
                            "whenProcessStarts",
                        blockType:
                            BlockType.HAT,
                        text:
                            "process [NAME]",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "main"
                            }
                        }
                    },

                    {
                        opcode:
                            "launchProcessByName",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "launch process [NAME]",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "main"
                            }
                        }
                    },

                    {
                        opcode:
                            "lastProcessLaunchInfo",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "last process launch info",
                        blockIconURI:
                            ASTRA_ICONS.workflow
                    },

                    {
                        opcode:
                            "processLaunchCount",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "total process launches",
                        blockIconURI:
                            ASTRA_ICONS.workflow
                    },

                    {
                        opcode:
                            "processExists",
                        blockType:
                            BlockType.BOOLEAN,
                        text:
                            "process [NAME] exists?",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "init"
                            }
                        }
                    },

                    {
                        opcode:
                            "processIsRunning",
                        blockType:
                            BlockType.BOOLEAN,
                        text:
                            "is process [NAME] running?",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "init"
                            }
                        }
                    },

                    {
                        opcode:
                            "processIsStopped",
                        blockType:
                            BlockType.BOOLEAN,
                        text:
                            "is process [NAME] stopped?",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "init"
                            }
                        }
                    },

                    {
                        opcode:
                            "processStateByName",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "process [NAME] state",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "init"
                            }
                        }
                    },

                    {
                        opcode:
                            "processPIDByName",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "PID of process [NAME]",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "init"
                            }
                        }
                    },

                    {
                        opcode:
                            "processTypeByName",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "type of process [NAME]",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "init"
                            }
                        }
                    },

                    {
                        opcode:
                            "processInfoByName",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "info for process [NAME]",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "init"
                            }
                        }
                    },

                    {
                        opcode:
                            "killProcessByName",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "kill process [NAME]",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "myProcess"
                            }
                        }
                    },

                    {
                        opcode:
                            "stopProcessByName",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "stop process [NAME]",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "myProcess"
                            }
                        }
                    },

                    {
                        opcode:
                            "resumeProcessByName",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "resume process [NAME]",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "myProcess"
                            }
                        }
                    },

                    {
                        opcode:
                            "restartProcessByName",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "restart process [NAME]",
                        blockIconURI:
                            ASTRA_ICONS.workflow,
                        arguments: {
                            NAME: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "myProcess"
                            }
                        }
                    },

                    {
                        opcode:
                            "processNames",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "process names",
                        blockIconURI:
                            ASTRA_ICONS.workflow
                    },

                    {
                        opcode:
                            "runningProcessCount",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "running process count",
                        blockIconURI:
                            ASTRA_ICONS.workflow
                    },

                    {
                        opcode:
                            "stoppedProcessCount",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "stopped process count",
                        blockIconURI:
                            ASTRA_ICONS.workflow
                    },

                    {
                        opcode:
                            "processTable",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "process table",
                        blockIconURI:
                            ASTRA_ICONS.workflow
                    },

                    // ==================================================
                    // BOOTLOADER
                    // ==================================================

                    {
                        opcode:
                            "bootCurrentOS",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "current OS",
                        blockIconURI:
                            ASTRA_ICONS.power
                    },

                    {
                        opcode:
                            "bootCurrentKernel",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "current boot kernel",
                        blockIconURI:
                            ASTRA_ICONS.power
                    },

                    {
                        opcode:
                            "bootDefaultOS",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "default boot OS",
                        blockIconURI:
                            ASTRA_ICONS.power
                    },

                    {
                        opcode:
                            "bootDefaultKernel",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "default boot kernel",
                        blockIconURI:
                            ASTRA_ICONS.power
                    },

                    {
                        opcode:
                            "setDefaultBoot",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "set default boot OS [OS] kernel [KERNEL]",
                        blockIconURI:
                            ASTRA_ICONS.power,
                        arguments: {
                            OS: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "ASTRAOS"
                            },
                            KERNEL: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "astra-kernel"
                            }
                        }
                    },

                    {
                        opcode:
                            "bootOS",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "boot OS [OS] kernel [KERNEL]",
                        blockIconURI:
                            ASTRA_ICONS.power,
                        arguments: {
                            OS: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "ASTRAOS"
                            },
                            KERNEL: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "astra-kernel"
                            }
                        }
                    },

                    {
                        opcode:
                            "setSafeMode",
                        blockType:
                            BlockType.COMMAND,
                        text:
                            "set safe mode [VALUE]",
                        blockIconURI:
                            ASTRA_ICONS.shield,
                        arguments: {
                            VALUE: {
                                type:
                                    ArgumentType.STRING,
                                defaultValue:
                                    "true"
                            }
                        }
                    },

                    {
                        opcode:
                            "safeMode",
                        blockType:
                            BlockType.BOOLEAN,
                        text:
                            "safe mode enabled?",
                        blockIconURI:
                            ASTRA_ICONS.shield
                    },

                    // ==================================================
                    // SECURITY
                    // ==================================================

                    {
                        opcode:
                            "isUnsandboxed",
                        blockType:
                            BlockType.BOOLEAN,
                        text:
                            "is running unsandboxed?",
                        blockIconURI:
                            ASTRA_ICONS.shield
                    },

                    {
                        opcode:
                            "systemInfo",
                        blockType:
                            BlockType.REPORTER,
                        text:
                            "browser system info",
                        blockIconURI:
                            ASTRA_ICONS.shield
                    }
                ]
            };
        }

        // ========================================================
        // PVRAM SAVE BLOCK
        // ========================================================

        pvramSave() {
            return this.savePVRAM();
        }
    }

    // ============================================================
    // CREATE EXTENSION
    // ============================================================

    const extension =
        new ASTRAKernel();

    // ============================================================
    // RXFS / RUNTIME CONNECTION
    // ============================================================

    try {

        if (
            Scratch.vm &&
            Scratch.vm.runtime
        ) {
            extension.setRuntime(
                Scratch.vm.runtime
            );
        }

    } catch {}

    // ============================================================
    // REGISTER
    // ============================================================

    Scratch.extensions.register(
        extension
    );

})(Scratch);