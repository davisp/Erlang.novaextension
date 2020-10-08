
const util = require("util.js");

function register(name, callable) {
    return nova.commands.register(name, callable);
}

exports.install_commands = function(client, disposables) {
    nova.workspace.onDidAddTextEditor((editor) => {
        let document = editor.document;

        if (!["erlang"].includes(document.syntax)) {
            return;
        }

        var ref = editor.onDidSave(() => {
            client.sendNotification("textDocument/didSave", {
                textDocument: {
                    uri: document.uri
                }
            });
        });
    });

    async function goToDefinition(editor) {
        console.log("Going to definition");
        try {
            const range = editor.selectedRange;
            const position = util.toLSPRange(editor.document, range).start;
            if(!position) {
                nova.workspace.showWarningMessage(
                    "Couldn't figure out what you've selected."
                );
                return;
            }
            const params = {
                textDocument: {uri: editor.document.uri},
                position: position
            };
            console.log("Params: " + JSON.stringify(params));
            const response = await client.sendRequest(
                "textDocument/definition",
                params
            );
            if(response == null) {
                nova.workspace.showWarningMessage("Couldn't find definition.");
                return;
            }

            console.log(JSON.stringify(response));

            nova.workspace.showWarningMessage("Yay command!");
        } catch(err) {
            console.log(err);
        }
    }

    disposables.add(register("erlang.goto_definition", util.wrap_command(goToDefinition)));
}

