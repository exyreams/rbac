/**
 * completion.ts — Shell tab-completion script generation.
 *
 * Usage:
 *   eval "$(rbac-cli completion bash)"     # bash
 *   eval "$(rbac-cli completion zsh)"      # zsh (sources bash compat)
 *   rbac-cli completion fish | source      # fish
 */

export function generateCompletion(shell: string): void {
  switch (shell.toLowerCase()) {
    case "bash":
      console.log(BASH_SCRIPT);
      break;
    case "zsh":
      console.log(ZSH_SCRIPT);
      break;
    case "fish":
      console.log(FISH_SCRIPT);
      break;
    default:
      console.error(`Unsupported shell: "${shell}". Use: bash, zsh, or fish.`);
      process.exitCode = 1;
  }
}

const BASH_SCRIPT = `
# rbac-cli bash completion
# Install: eval "$(rbac-cli completion bash)"
# Persist: rbac-cli completion bash >> ~/.bashrc

_rbac_cli() {
  local cur prev words cword
  _init_completion || return

  local subcmd="\${words[1]}"
  local subsub="\${words[2]}"

  # Top-level commands
  if [[ \$cword -eq 1 ]]; then
    COMPREPLY=($(compgen -W "org role member vault config completion" -- "\$cur"))
    return
  fi

  # Subcommands
  case "\$subcmd" in
    org)
      COMPREPLY=($(compgen -W "init show use list transfer-admin close" -- "\$cur"))
      ;;
    role)
      COMPREPLY=($(compgen -W "create show list update deactivate reactivate close perms" -- "\$cur"))
      ;;
    member)
      COMPREPLY=($(compgen -W "assign revoke show check refresh update-expiry leave close list" -- "\$cur"))
      ;;
    vault)
      COMPREPLY=($(compgen -W "create write read delete show list" -- "\$cur"))
      ;;
    config)
      COMPREPLY=($(compgen -W "status reset" -- "\$cur"))
      ;;
    completion)
      COMPREPLY=($(compgen -W "bash zsh fish" -- "\$cur"))
      ;;
  esac
}

complete -F _rbac_cli rbac-cli 2>/dev/null
complete -F _rbac_cli "npx tsx src/index.ts" 2>/dev/null
`.trim();

const ZSH_SCRIPT = `
# rbac-cli zsh completion (uses bash compat)
# Install: eval "$(rbac-cli completion zsh)"
autoload -U +X bashcompinit 2>/dev/null && bashcompinit 2>/dev/null
${BASH_SCRIPT}
`.trim();

const FISH_SCRIPT = `
# rbac-cli fish completion
# Install: rbac-cli completion fish | source
# Persist: rbac-cli completion fish > ~/.config/fish/completions/rbac-cli.fish

set -l cmds org role member vault config completion

complete -c rbac-cli -n "not __fish_seen_subcommand_from $cmds" -a "org" -d "Organization management"
complete -c rbac-cli -n "not __fish_seen_subcommand_from $cmds" -a "role" -d "Role management"
complete -c rbac-cli -n "not __fish_seen_subcommand_from $cmds" -a "member" -d "Membership management"
complete -c rbac-cli -n "not __fish_seen_subcommand_from $cmds" -a "vault" -d "Vault operations"
complete -c rbac-cli -n "not __fish_seen_subcommand_from $cmds" -a "config" -d "CLI configuration"
complete -c rbac-cli -n "not __fish_seen_subcommand_from $cmds" -a "completion" -d "Shell completion"

complete -c rbac-cli -n "__fish_seen_subcommand_from org" -a "init show use list transfer-admin close"
complete -c rbac-cli -n "__fish_seen_subcommand_from role" -a "create show list update deactivate reactivate close perms"
complete -c rbac-cli -n "__fish_seen_subcommand_from member" -a "assign revoke show check refresh update-expiry leave close list"
complete -c rbac-cli -n "__fish_seen_subcommand_from vault" -a "create write read delete show list"
complete -c rbac-cli -n "__fish_seen_subcommand_from config" -a "status reset"
complete -c rbac-cli -n "__fish_seen_subcommand_from completion" -a "bash zsh fish"

complete -c rbac-cli -l cluster -s c -d "Solana RPC URL"
complete -c rbac-cli -l keypair -s k -d "Signer keypair path"
complete -c rbac-cli -l json -d "JSON output"
complete -c rbac-cli -l verbose -d "Full pubkeys"
complete -c rbac-cli -l force -s f -d "Skip confirmations"
complete -c rbac-cli -l dry-run -d "Simulate only"
`.trim();