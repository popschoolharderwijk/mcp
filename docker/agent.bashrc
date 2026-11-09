# Interactive shell defaults for the container `agent` user.
# Sourced from ~/.bashrc (seeded by docker/seed-agent-home.sh).

export PATH="${HOME}/.local/bin:${PATH}"

case $- in
	*i*) ;;
	*) return ;;
esac

HISTCONTROL=ignoreboth
shopt -s histappend
HISTSIZE=1000
HISTFILESIZE=2000
shopt -s checkwinsize

# Agent prompt: diamond + orange username; @host (green) and cwd (blue) stay usual.
if [ -x /usr/bin/tput ] && tput setaf 1 >&/dev/null; then
	PS1='\[\033[01;38;5;166m\]◆ \u\[\033[01;32m\]\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
else
	PS1='◆ \u:\w\$ '
fi

case "$TERM" in
	xterm* | rxvt*)
		PS1="\[\e]0;\u@\h: \w\a\]${PS1}"
		;;
esac

if [ -x /usr/bin/dircolors ]; then
	test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
	alias ls='ls --color=auto'
	alias grep='grep --color=auto'
	alias fgrep='fgrep --color=auto'
	alias egrep='egrep --color=auto'
fi

if ! shopt -oq posix; then
	if [ -f /usr/share/bash-completion/bash_completion ]; then
		. /usr/share/bash-completion/bash_completion
	elif [ -f /etc/bash_completion ]; then
		. /etc/bash_completion
	fi
fi
