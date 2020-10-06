var langserver = null;

exports.activate = function() {
    // Do work when the extension is activated
    console.log("Activating Erlang Language Server");
    langserver = new ErlangLanguageServer();
};

exports.deactivate = function() {
    // Clean up state before the extension is deactivated
    console.log("Deactivate Erlang Language Server");
    if (langserver) {
        langserver.deactivate();
        langserver = null;
    }
};

const compositeDisposable = new CompositeDisposable();


function registerGoToDefinition(client) {
    function toLSPRange(document, range) {
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

    function goToDefinition(editor) {
        console.log("Going to definition");
        try {
            const selectedRange = editor.selectedRange;
            const selectedPosition = toLSPRange(editor.document, selectedRange).start;
            if (!selectedPosition) {
                nova.workspace.showWarningMessage(
                    "Couldn't figure out what you've selected."
                );
                return;
            }
            const definitionParams = {
                textDocument: {uri: editor.document.uri},
                position: selectedPosition
            };
            const response = client.sendRequest(
                "textDocument/definition",
                definitionParams
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

    console.log("Registering goToDefinition");
    return nova.commands.register(
        "erlang.goToDefinition",
        goToDefinition
    );
}

class ErlangLanguageServer {    
    constructor() {        
        nova.workspace.onDidAddTextEditor((editor) => {
            let document = editor.document;
            
            if (!["erlang"].includes(document.syntax)) {
                return;
            }
            
            editor.onWillSave(() => {
                if (!this.languageClient) return;
                this.languageClient.sendNotification("textDocument/didSave", {
                    textDocument: {
                        uri: document.uri
                    }
                });
            });
        });

        this.start();
    }
 
    deactivate() {
        this.stop();
    }
    
    start() {
        if (this.languageClient) {
            this.languageClient.stop();
            nova.subscriptions.remove(this.languageClient);
        }
        
        // Check and extract language server
        const fixLangServerprocess = new Process("/usr/bin/env", {
            args: ["chmod", "755", nova.path.join(nova.extension.path, "/bin/erlang_ls")],
            cwd: nova.extension.path
        });

        fixLangServerprocess.start();
        
        // Create the client
        var serverOptions = {
            path: nova.extension.path + "/bin/erlang_ls",
            args: ["-l", "debug"]
        };
        var clientOptions = {
            syntaxes: [
                "erlang"
            ]
        };
        var client = new LanguageClient("erlang", "Erlang Language Server", serverOptions, clientOptions);
        
        try {
            compositeDisposable.add(registerGoToDefinition(client));
            
            client.onNotification("initialized", () => {
                console.log("initialized");
            });
            
            client.onNotification("window/showMessage", (params) => {
                console.log("window/showMessage", JSON.stringify(params));
            });
        } catch(err) {
            console.log(err);
        }
        
        console.log("Staring Erlang Language Server Client");
        
        try {
            // Start the client
            client.start();
                        
            client.sendNotification("workspace/didChangeConfiguration");
            
            // Add the client to the subscriptions to be cleaned up
            nova.subscriptions.add(client);
            this.languageClient = client;
            console.log("Erlang language server started.");
        } catch (err) {
            console.log(err);
            // If the .start() method throws, it's likely because the path to the language server is invalid
            if (nova.inDevMode()) {
                console.error(err);
            }
        }
    }
    
    stop() {
        if (this.languageClient) {
            this.languageClient.stop();
            nova.subscriptions.remove(this.languageClient);
            this.languageClient = null;
        }
    }
}
