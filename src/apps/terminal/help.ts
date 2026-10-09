interface CommandHelp {
  usage: string;
  description: string;
  example: string;
  note?: string;
}

const commands: Record<string, CommandHelp> = {
  help: {
    usage: "help [command]",
    description: "Show this guide, or explain one command.",
    example: "help echo",
  },
  clear: {
    usage: "clear",
    description:
      "Clear the terminal display. Your files and command history remain.",
    example: "clear",
  },
  ls: {
    usage: "ls [folder]",
    description:
      "List the contents of the current folder, or a named folder. A trailing / marks a folder.",
    example: "ls Documents",
  },
  cd: {
    usage: "cd [folder]",
    description:
      "Change the folder you are working in. With no argument, return to the filesystem root.",
    example: "cd /Documents",
    note: "Use cd .. to go up one folder, or cd / to return to the root.",
  },
  pwd: {
    usage: "pwd",
    description: "Show the full path of your current folder.",
    example: "pwd",
  },
  mkdir: {
    usage: "mkdir name",
    description: "Create a folder inside your current folder.",
    example: "mkdir Projects",
    note: "Use a single name, without spaces or slashes. Parent folders are not created automatically.",
  },
  touch: {
    usage: "touch name",
    description: "Create an empty text file inside your current folder.",
    example: "touch todo.txt",
    note: "Use a single name, without spaces or slashes. This creates a new file; it does not update an existing file.",
  },
  cat: {
    usage: "cat file",
    description: "Print a text file's contents in the terminal.",
    example: "cat /Documents/Welcome.txt",
  },
  echo: {
    usage: "echo text\necho text > filename",
    description: "Print text, or write it into a file using >.",
    example: "echo Buy milk > todo.txt",
    note: "Put spaces around >. Writing to an existing file replaces its contents. For a new file, use a plain filename in the current folder. Append (>>) is not supported.",
  },
  rm: {
    usage: "rm path",
    description: "Move a file or folder to Trash.",
    example: "rm todo.txt",
    note: "Restore it with the Trash app or the Trash location in Files. Shell flags such as -r and -f are not supported.",
  },
  mv: {
    usage: "mv source destination",
    description:
      "Move an item into an existing folder, or rename it in your current folder.",
    example: "mv todo.txt /Documents",
    note: "To rename: mv todo.txt shopping.txt. For a new name, use a plain filename, not a new path.",
  },
  cp: {
    usage: "cp source destination",
    description:
      "Copy a file into an existing folder, or create a copy with a new name in your current folder.",
    example: "cp todo.txt backup.txt",
    note: "For a destination folder: cp todo.txt /Documents. Terminal folder copies do not include their contents; use Files for recursive folder copying.",
  },
  date: {
    usage: "date",
    description: "Show the browser's current date and time.",
    example: "date",
  },
  whoami: {
    usage: "whoami",
    description: "Show your FakeOS profile name.",
    example: "whoami",
  },
  neofetch: {
    usage: "neofetch",
    description: "Show a summary of FakeOS and its browser runtime.",
    example: "neofetch",
  },
  history: {
    usage: "history",
    description: "Show earlier commands entered in this terminal session.",
    example: "history",
    note: "Use the Up and Down arrow keys to recall commands. History resets when this terminal is closed.",
  },
};

export function terminalHelp(command?: string): string {
  if (command) {
    const entry = commands[command];
    if (!entry)
      return `No help for "${command}". Type help to see available commands.`;
    return `${entry.usage}\n${entry.description}\n\nExample: ${entry.example}${entry.note ? `\n\n${entry.note}` : ""}`;
  }
  return [
    "FAKEOS TERMINAL — GETTING STARTED",
    "Type a command, then press Enter. Use help command for details, such as help echo.",
    "",
    "MOVING AROUND",
    "You start at /, the root of your FakeOS files. Documents, Downloads, Pictures, and other folders live here.",
    "A path starting with / begins at the root. Other paths begin in your current folder.",
    "Names are case-sensitive: Documents and documents are different. Use pwd to see your current folder.",
    "",
    "COMMANDS",
    ...Object.values(commands).map(
      (entry) =>
        `${entry.usage.replace(/\n/g, " or ")}\n  ${entry.description}`,
    ),
    "",
    "TRY IT — enter each line separately",
    "  cd /Documents",
    "  mkdir Practice",
    "  cd Practice",
    "  echo Hello from FakeOS > hello.txt",
    "  cat hello.txt",
    "  cp hello.txt backup.txt",
    "  ls",
    "  cd ..",
    "Your Practice folder and both files are also available in the Files app.",
    "",
    "SHORTCUTS & LIMITS",
    "Up / Down: recall commands. Tab: complete a matching name in the current folder.",
    "Use names without spaces. Quotes, pipes, command chaining, shell flags, and >> are not supported.",
    "> replaces a file's contents. rm moves items to Trash; restore them in Files.",
    "This shell operates only on FakeOS's virtual files, stored in this browser. It cannot run programs or commands on your computer or Codespace.",
    "Files survive refresh, but clearing browser data can remove them. They do not sync between devices.",
  ].join("\n");
}
