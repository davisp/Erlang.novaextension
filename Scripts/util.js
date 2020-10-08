
exports.wrap_command = (command) => {
    return async function wrapped(...args) {
        console.log("Executing wrapped function?");
        try {
            await command(...args);
        } catch (err) {
            nova.workspace.showErrorMessage(err);
        }
    };
}


exports.toLSPRange = (document, range) => {
    const contents = document.getTextInRange(new Range(0, document.length));
    let chars = 0;
    let range_start = undefined;
    const lines = contents.split(document.eol);
    for(let idx = 0; idx < lines.length; idx++) {
        const line_len = lines[idx].length + document.eol.length;
        if(!range_start && chars + line_len >= range.start) {
            range_start = {
                line: idx,
                character: range.start - chars
            };
        }
        if(range_start && chars + line_len >= range.end) {
            return {
                start: range_start,
                end: {
                    line: idx,
                    character: range.end - chars
                }
            };
        }
        chars += line_len;
      }
      return null;
}

