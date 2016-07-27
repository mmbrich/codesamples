#!/bin/bash
SESS=`basename $PWD`
SESSION="${SESS}-build"

tmux ls|grep ${SESSION}
IS_SESSION=`echo $?`
if [ "${IS_SESSION}" == "0" ]
then
        tmux -2 attach-session -t $SESSION
        exit 0
else
        tmux -2 new-session -d -s $SESSION
fi

# 0 = top left
# 1 = bottom left
# 2 = top right
# 3 = bottom right
tmux rename-window -t $SESSION:0 Console
tmux split-window -h

tmux select-pane -t 0 
tmux split-window -v
tmux resize-pane -L 40
tmux resize-pane -D 10

tmux select-pane -t 2
tmux split-window -v
tmux resize-pane -D 10

tmux send-keys -t "$SESSION:0.0" C-z 'top' Enter
tmux send-keys -t "$SESSION:0.1" C-z 'sudo watch docker images --format \"table {{.Repository}}\\t{{.Tag}}\\t{{.CreatedSince}}\\t{{.Size}}\"' Enter
tmux send-keys -t "$SESSION:0.3" C-z 'sudo watch docker ps --format \"table {{.ID}}\\t{{.Image}}\\t{{.Command}}\\t{{.Status}}\\t{{.RunningFor}}\\t{{.Ports}}\"' Enter

tmux send-keys -t "$SESSION:0.2" C-z 'source aliases.bash && PATH=./bin/:$PATH' Enter
tmux select-window -t $SESSION:0
tmux select-pane -t 2
tmux -2 attach-session -t $SESSION
