FROM node:14

ADD entrypoint.sh /entrypoint.sh
RUN chmod +x entrypoint.sh
ADD filter_changed_files.js /filter_changed_files.js
ADD logic.js /logic.js
ENTRYPOINT ["/entrypoint.sh"]
