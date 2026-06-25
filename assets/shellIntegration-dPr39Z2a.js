const c="# >>> BridgeSpace shell integration >>>",i="# <<< BridgeSpace shell integration <<<",m=`${c}
# BridgeSpace emits OSC 133 semantic prompt markers so its AI inline
# autocomplete can tell when you are typing vs when a command is
# running. Safe to delete this block — it only adds precmd/preexec
# hooks. Unset BRIDGESPACE_SHELL_INTEGRATION to disable at runtime.
if [[ -o interactive && "\${BRIDGESPACE_SHELL_INTEGRATION:-1}" != "0" ]]; then
  __bridgespace_prompt_start() { printf '\\e]133;A\\a'; }
  __bridgespace_command_start() { printf '\\e]133;C\\a'; }
  autoload -Uz add-zsh-hook 2>/dev/null
  if (( \${+functions[add-zsh-hook]} )); then
    add-zsh-hook precmd __bridgespace_prompt_start 2>/dev/null
    add-zsh-hook preexec __bridgespace_command_start 2>/dev/null
  fi
fi
${i}`;function w(e,t){const n=e.indexOf(c),r=e.indexOf(i);if(n===-1&&r===-1){const l=e.replace(/\s+$/u,""),p=l.length===0?"":`

`;return`${l}${p}${t}
`}if(n===-1||r===-1||r<n)return e;const s=e.slice(0,n),d=r+i.length;let a=e.slice(d);a.startsWith(`
`)&&(a=a.slice(1));const o=s.replace(/\s+$/u,""),u=o.length===0?"":`

`,h=a.length===0?`
`:`
${a}`;return`${o}${u}${t}${h}`}function _(e){const t=e.indexOf(c),n=e.indexOf(i);if(t===-1||n===-1||n<t)return e;const r=e.slice(0,t).replace(/\s+$/u,""),s=e.slice(n+i.length).replace(/^\n/u,"");return r.length===0&&s.length===0?"":r.length===0?s:s.length===0?`${r}
`:`${r}

${s}`}async function f(){const e=window.tauriAPI;if(!e?.system?.getHomeDir||!e?.fs?.join)return null;try{const t=await e.system.getHomeDir();return t?await e.fs.join(t,".zshrc"):null}catch{return null}}async function g(){const e=window.tauriAPI;if(!e?.fs?.readFile||!e?.fs?.writeFile)return!1;const t=await f();if(!t)return!1;let n="";try{n=await e.fs.readFile(t)}catch{n=""}const r=w(n,m);if(r===n)return!1;try{return await e.fs.writeFile(t,r),!0}catch(s){return console.warn("[terminal-assist] failed to write zsh shell integration",s),!1}}async function $(){const e=window.tauriAPI;if(!e?.fs?.readFile||!e?.fs?.writeFile)return!1;const t=await f();if(!t)return!1;let n;try{n=await e.fs.readFile(t)}catch{return!1}const r=_(n);if(r===n)return!1;try{return await e.fs.writeFile(t,r),!0}catch(s){return console.warn("[terminal-assist] failed to remove zsh shell integration",s),!1}}export{c as MARKER_BEGIN,i as MARKER_END,m as ZSH_TEMPLATE,g as installZshIntegration,_ as removeBlock,w as spliceBlock,$ as uninstallZshIntegration};
