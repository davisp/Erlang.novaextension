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
