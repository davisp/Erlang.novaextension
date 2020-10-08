const commands = require("commands.js");


let client = null;
const disposables = new CompositeDisposable();

async function ensure_executable(rel_path) {
    return new Promise((resolve, reject) => {
        const proc = new Process("/usr/bin/env", {
            args: ["chmod", "755", nova.path.join(nova.extension.path, rel_path)],
            cwd: nova.extension.path
        });
        proc.onDidExit((code) => {
            if(code === 0) {
                resolve(code);
            } else {
                reject(code);
            }
        })
        proc.start();
    })
}

async function async_activate() {
    await ensure_executable("/bin/erlang_ls");

    var args = [];
    if(nova.inDevMode()) {
        args = ["-l", "debug"]
    }

    client = new LanguageClient(
        "erlang",
        "Erlang Language Server",
        {
            type: "stdio",
            path: nova.extension.path + "/bin/erlang_ls",
            args: args
        },
        {
            syntaxes: ["erlang"]
        }
    );

    client.onRequest(
        "workspace/applyEdit",
        async (params) => {
            console.log(params.edit);
        }
    );

    // Not working, I'm guessing Nova intercepts this notification.
    client.onNotification("initialized", () => {
        console.log("initialized");
    });

    client.onNotification("window/showMessage", (params) => {
        console.log("window/showMessage", JSON.stringify(params));
    });

    client.start();

    commands.install_commands(client, disposables);
}

exports.activate = function() {
    // Do work when the extension is activated
    return async_activate().catch((err) => {
        console.error("Failed to activate Erlang extension");
        console.error(err);
        nova.workspace.showErrorMessage(err);
    }).then(() => {
      console.log("Erlang extension has been activated.");
    });
};

exports.deactivate = function() {
    // Clean up state before the extension is deactivated
    if(client != null) {
        client.stop();
    }
    disposables.dispose();
};
