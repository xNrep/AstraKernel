# ASTRA Kernel

ASTRA Kernel is a simulated operating-system kernel and system API for **Scratch, TurboWarp and PenguinMod**.

It provides process management, a boot system, PVRAM configuration, syscalls, terminal commands, logging, crash/panic handling, security/system information and process-driven Scratch scripts.

> **Current version:** 3.3.0

## Features

- 🧠 Kernel and OS identity
- ⚙️ Process manager with PID, name, type and state
- ▶️ Process launch/restart/stop/resume/kill controls
- 🧩 Process event scripts
- 💾 Persistent-style PVRAM configuration
- 🔌 Syscall system
- 🖥️ Built-in terminal commands
- 📜 Kernel logs
- 💥 Panic/crash system
- 🚀 Bootloader and safe mode
- 🔐 Security and runtime information
- 📊 Process tables and process statistics

## Installation

### TurboWarp

1. Download `AstraKernel.js`.
2. Open the TurboWarp Extensions menu.
3. Choose **Custom Extension**.
4. Load the JavaScript file.
5. ASTRA Kernel will appear as an extension.

### PenguinMod

Load `AstraKernel.js` as a custom JavaScript extension.

## Process System

Processes are the main programmable unit of ASTRA Kernel.

Each process has information such as:

- PID
- Name
- Type
- State
- Creation time
- Start time
- Restart count
- Launch count
- Last launch timestamp

### Process event

Use:

```
process [NAME]
```

as a hat block at the top of a script.

Example:

```
process [graphics]
say [Graphics process started!]
```

A process can have multiple scripts:

```
process [network]
...
```

```
process [network]
...
```

Both scripts are started when the process is launched.

### Launching a process

Use:

```
launch process [NAME]
```

If the process does not already exist, ASTRA Kernel creates it automatically as a user process.

Launching a process:

1. Finds the process by name.
2. Sets it to RUNNING when necessary.
3. Increments its launch counter.
4. Records the launch timestamp.
5. Starts every matching `process [NAME]` script.

This makes processes behave like lightweight programmable services.

## Process Management

Available operations include:

- Create a process
- Kill a process
- Stop a process
- Resume a process
- Restart a process
- Check whether a process exists
- Check whether a process is running
- Check whether a process is stopped
- Read a process state
- Get a process PID
- Get a process type
- Get complete process information
- List process names
- Count running processes
- Count stopped processes
- Generate a process table

Process names are matched case-insensitively and surrounding whitespace is ignored.

## Built-in Processes

ASTRA Kernel starts with two system processes:

| PID | Name | Type | State |
|---:|---|---|---|
| 0 | `init` | system | RUNNING |
| 1 | `kernel` | kernel | RUNNING |

PID 0 and PID 1 are protected from normal process restart/kill operations.

## PVRAM

PVRAM is ASTRA Kernel's persistent-style configuration store.

Default sections include:

- `boot`
- `kernel`
- `graphics`
- `audio`
- `network`
- `security`
- `system`
- `extensions`
- `custom`

PVRAM values can be accessed using dotted paths, for example:

```
kernel.hostname
graphics.resolution
system.darkmode
```

The kernel merges stored configuration with the default PVRAM structure so missing sections can safely fall back to defaults.

## Syscalls

ASTRA Kernel exposes a syscall system for internal and Scratch-side operations.

Current process-related syscalls include:

- `process.count`
- `process.running`
- `process.list`
- `process.names`
- `kernel.uptime.ms`

The extension also keeps track of the last syscall and its result.

## Terminal

The kernel provides a lightweight terminal interface.

The `ps` command displays a readable process table.

`psl` returns the raw process list as JSON.

The terminal is intended for simulated OS environments and debugging inside Scratch projects.

## Logging

ASTRA Kernel records kernel events with log levels such as:

- INFO
- WARN
- ERROR

Logs are useful for debugging process launches, process state changes, boot operations and runtime errors.

## Panic and Crash System

The kernel includes a simulated panic/crash system for OS projects.

It can be used to represent fatal kernel errors and provide a controlled failure screen instead of silently stopping the project.

Crash information is also stored by the kernel for later inspection.

## Bootloader

ASTRA Kernel keeps track of:

- Current OS
- Current kernel
- Default boot OS
- Default boot kernel
- Safe mode

The boot system can switch the simulated OS/kernel identity and configure the default boot target.

## Security

The extension can report whether it is running unsandboxed and exposes basic browser/system information.

Security settings include a simulated lockdown option.

These features describe the environment available to the Scratch runtime; they do not turn Scratch into a real operating-system security boundary.

## Compatibility

ASTRA Kernel is designed for:

- Scratch-compatible runtimes
- TurboWarp
- PenguinMod

Some advanced runtime behavior, especially process-script launching, depends on the runtime exposing the expected Scratch VM runtime APIs.

## Example

A simple process architecture could look like this:

```text
ASTRAOS
│
├── init
├── kernel
├── graphics
│   ├── renderer script
│   └── display manager script
├── audio
│   └── audio manager script
└── network
    ├── network manager script
    └── connection monitor script
```

Then a controller script can use:

```
launch process [graphics]
launch process [audio]
launch process [network]
```

Each process can own multiple independent Scratch scripts.

## Extension Blocks

The extension includes blocks for:

### Process manager

- `process [NAME]`
- `launch process [NAME]`
- `last process launch info`
- `create process [NAME] type [TYPE]`
- `kill process [PID]`
- `process list`
- `process count`
- `process [NAME] exists?`
- `is process [NAME] running?`
- `is process [NAME] stopped?`
- `process [NAME] state`
- `PID of process [NAME]`
- `type of process [NAME]`
- `info for process [NAME]`
- `kill process [NAME]`
- `stop process [NAME]`
- `resume process [NAME]`
- `restart process [NAME]`
- `process names`
- `running process count`
- `stopped process count`
- `process table`

### Boot

- Current OS
- Current boot kernel
- Default boot OS
- Default boot kernel
- Set default boot target
- Boot OS/kernel
- Set safe mode
- Safe mode status

### System and security

- Browser/system information
- Unsandboxed status
- Kernel/runtime information

Additional kernel, PVRAM, terminal, syscall and logging blocks are also included in the extension.

## Architecture

The extension is implemented as a single JavaScript Scratch extension.

At a high level:

```text
Scratch Runtime
      │
      ▼
ASTRA Kernel Extension
      │
      ├── Process Manager
      ├── Process Event Dispatcher
      ├── Bootloader
      ├── PVRAM
      ├── Syscalls
      ├── Terminal
      ├── Logger
      ├── Panic/Crash System
      └── Runtime Integration
```

The process event dispatcher uses the Scratch runtime's hat-start mechanism to launch scripts associated with a process name.

## Versioning

Current release:

**v3.3.0**

The 3.3.x line focuses on process management and process-driven Scratch execution.

## License

This project is licensed under the **MIT License**.

See [LICENSE](LICENSE) for the full license text.

## Author

Created by **xNrep**.

## Disclaimer

ASTRA Kernel is a simulated kernel for Scratch-compatible environments. It does not provide real operating-system kernel functionality, hardware access, memory protection or real process isolation.

It is, however, perfectly capable of pretending that it does — which is exactly what a good fictional OS should do.
