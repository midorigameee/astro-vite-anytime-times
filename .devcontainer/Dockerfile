FROM node:22.4.1-bookworm
EXPOSE 4321

### 各種必要なパッケージとエイリアスの設定
RUN apt-get update \
    && apt-get install -y git vim curl \
    && apt-get clean
RUN echo "# Alias setting" >> ~/.bashrc
RUN echo "alias la='ls -a'" >> ~/.bashrc
RUN echo "alias ll='ls -l'" >> ~/.bashrc

### bashで日本語を使う設定(https://qiita.com/yokoto/items/fc2ecdc0a7a5e14bdcaa)
RUN apt-get update \
    && apt-get install -y locales
RUN locale-gen ja_JP.UTF-8
RUN echo "# Lang setting" >> ~/.bashrc
RUN echo "export LANG=ja_JP.UTF-8" >> ~/.bashrc
RUN echo 'export LANGUAGE="ja_JP:ja"' >> ~/.bashrc
RUN echo 'export LC_ALL="ja_JP.UTF-8"' >> ~/.bashrc
RUN localedef -f UTF-8 -i ja_JP ja_JP.utf8

### bashでGit情報を表示させるプロンプトの設定(https://zenn.dev/daifukuninja/articles/9e903808f4147d)
RUN echo "# Git setting" >> ~/.bashrc
RUN echo "source /usr/share/bash-completion/completions/git" >> ~/.bashrc

WORKDIR /usr/share/bash-completion/completions

RUN curl -O https://raw.githubusercontent.com/git/git/master/contrib/completion/git-prompt.sh
RUN curl -O https://raw.githubusercontent.com/git/git/master/contrib/completion/git-completion.bash
RUN chmod a+x git*.*
RUN ls -l $PWD/git*.* | awk '{print "source "$9}' >> ~/.bashrc

RUN echo "GIT_PS1_SHOWDIRTYSTATE=true" >> ~/.bashrc
RUN echo "GIT_PS1_SHOWUNTRACKEDFILES=true" >> ~/.bashrc
RUN echo "GIT_PS1_SHOWUPSTREAM=auto" >> ~/.bashrc

RUN echo 'export PS1="\[\033[01;32m\]\u@\h\[\033[01;33m\] \w \[\033[01;31m\]\$(__git_ps1 \"(%s)\") \\n\[\033[01;34m\]\\$ \[\033[00m\]"' >> ~/.bashrc

### Gitの設定
RUN git config --global --add safe.directory /workspace
RUN git config --global core.quotepath false
RUN git config --global push.default current

### node_modulesを予め用意しておく設定（まだ最適な設定方法がわかってない…）
# WORKDIR /workspace/xxxx
# COPY ./xxxx/package*.json /workspace/xxxx
# RUN npm install