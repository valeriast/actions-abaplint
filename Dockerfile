FROM node:14

ADD entrypoint.sh /entrypoint.sh
RUN chmod +x entrypoint.sh
ADD logic.js /logic.js
ENTRYPOINT ["/entrypoint.sh"]
