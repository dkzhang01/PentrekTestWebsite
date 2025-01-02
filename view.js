export class webView {
    #controller
    #columns
    #stepNames
    #num_commits
    constructor(controller) {
        this.#controller = controller
        this.#columns = {
            "Setup":["Checkout code", "Install brew", "Install Cairo", "Install Bazel", "sync"],
            "Basic Tests": ["Myapp", "tools:tests", "ray:unittests", "wrapper_smart_ptrs :unittests", "tools:bench", "tools:cskiaapp", "gm:gmapp"]
        }
        this.#stepNames = []
        this.#num_commits = 10
    }

    render_login(render_div) {
        const form = document.createElement('form');
        form.classList.add("login")
        const form_title = document.createElement('p');
        form_title.textContent = 'Pentrek Unit Testing'
        form.append(form_title)

        const key = document.createElement('label');
        key.setAttribute('for', 'key');
        key.textContent = 'key: ';
        form.appendChild(key);
        
        const keyInput = document.createElement('input');
        keyInput.setAttribute('type', 'text');
        keyInput.setAttribute('id', 'key');
        keyInput.setAttribute('name', 'key');
        form.appendChild(keyInput);
        
        form.appendChild(document.createElement('br'));

        const submitButton = document.createElement('button');
        submitButton.setAttribute('type', 'submit');
        submitButton.textContent = 'Submit';
        form.appendChild(submitButton);
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            
            const key = keyInput.value;
            this.render(render_div)
            this.#controller.login(key)
          });

        // Append the form to the body
        render_div.appendChild(form);
    }

    render(render_div) {
        render_div.innerHTML = "";
        // Render header bar
        let header_bar = document.createElement("div");
        header_bar.textContent = "Some Status Message"
        render_div.append(header_bar);

        //render main table
        let table = document.createElement("table");
        table.classList.add("mainTable")
        render_div.append(table);
        let r1 = document.createElement("tr")
        let d11 = document.createElement("th")
        d11.colSpan = 2
        let num_label = document.createElement("label");
        num_label.textContent = "Commits: "
        let num_input = document.createElement("input");
        num_input.type="number"
        num_input.min = 1
        num_input.value = 10 // default number of commits to show
        num_input.max = 20
        let reload_button = document.createElement("button");
        reload_button.textContent = "Reload"
        reload_button.onclick = () => {
            console.log("reloading")
            this.fill_table(table, num_input.value, render_div)
            this.#num_commits = num_input.value
        }
        d11.append(num_label, num_input, reload_button)
        let d12 = document.createElement("th")
        r1.append(d11, d12)
        let r2 = document.createElement("tr");
        let d21 = document.createElement("th")
        let container = document.createElement("div")
        //Row Fields
        container.textContent = "Commit"
        container.classList.add("titleContainer")
        d21.append(container)
        let d22 = document.createElement("th")
        container = document.createElement("div");
        container.textContent = "Committer";
        container.classList.add("titleContainer")
        d22.append(container)
        let d23 = document.createElement("th");
        container = document.createElement("div");
        container.textContent = "Commit Date";
        container.classList.add("titleContainer")
        d23.append(container)
        r2.append(d21, d22, d23)
        for (let key in this.#columns) {
            let title = document.createElement("th")
            let titleContainer = document.createElement("div")
            titleContainer.textContent = key
            titleContainer.classList.add("titleContainer")
            title.append(titleContainer)
            title.colSpan = 0
            r1.append(title)
            for (let colName of this.#columns[key]) {
                let colTitle = document.createElement("th");
                let colTitleContainer = document.createElement("div")
                colTitleContainer.title = colName;
                colTitleContainer.classList.add("testName")
                colTitle.append(colTitleContainer)
                r2.append(colTitle)
                this.#stepNames.push(colName);
                title.colSpan += 1
            }
        }
        table.append(r1, r2)
        document.addEventListener("update", () => {
            console.log("updating")
            this.fill_table(table, this.#num_commits, render_div)
        })
    }

    fill_table(table, count, render_div) {
        // Need to delete some parts of the table
        let commit_row = table.querySelector(".CommitEntry")
        while (commit_row != null) {
            table.removeChild(commit_row)
            commit_row = table.querySelector(".CommitEntry")
        }
        const workflowsToDisplay = this.#controller.getViewWorkflows(count)
        for (let wf of workflowsToDisplay) {
            let row = document.createElement("tr")
            let commit_id = document.createElement("th")
            let commit_id_div = document.createElement("div");
            commit_id_div.classList.add("commitDiv")
            commit_id_div.title = wf.display_title
            commit_id_div.addEventListener("click", (e) => {
                e.preventDefault()
                window.open("https://github.com/mikerreed/pentrek/commit/" + wf.head_sha, "_blank");
            })
            commit_id.append(commit_id_div)
            let committer_d = document.createElement("th")
            let committer_div = document.createElement("div")
            committer_div.textContent = wf.committer.name
            committer_div.title = wf.committer.email
            committer_div.addEventListener("click", () => {
                navigator.clipboard.writeText(wf.committer.email).then(() => {
                    console.log("Text copied to clipboard!");
                }).catch(err => {
                    console.error("Failed to copy text: ", err);
                });
            })
            committer_d.append(committer_div)
            let commit_date = document.createElement("th");
            commit_date.textContent = this.convert_date(wf.commitDate)
            row.append(commit_id, committer_d, commit_date)
            const wfStepnames = wf.steps.map((s) => s.name)
            let success_counts = 0
            let inprogress_counts = 0
            let failed_counts = 0 
            for (let stepName of this.#stepNames) {
                if (wfStepnames.indexOf(stepName) > -1) {
                    const step = wf.steps[wfStepnames.indexOf(stepName)]
                    let entry = document.createElement("th")
                    let entryContainer = document.createElement("div")
                    entryContainer.title = step.name + "@" + this.convert_date(step.startTime)
                    entryContainer.classList.add("status")
                    entry.append(entryContainer)
                    if (step.conclusion == "success") {
                        success_counts++;
                        entryContainer.classList.add("successEntry")
                    }
                    else {
                        if (step.status == "in_progress") {
                            inprogress_counts++;
                            entryContainer.classList.add("inProgressEntry")
                        } else {
                            failed_counts++;
                            entryContainer.classList.add("failedEntry")
                        }
                    }
                    entryContainer.addEventListener("click", (e) => {
                        console.log(step)
                        this.showStep(step, render_div)
                    })
                    row.append(entry)
                } else {
                    let entry = document.createElement("th")
                    entry.textContent = "NA"
                    row.append(entry)
                }
            }
            let total_steps = success_counts + inprogress_counts + failed_counts
            commit_id_div.style.background = `linear-gradient(to right, rgb(102,166,30) ${(success_counts / total_steps) * 100}%, rgb(117,112,179) ${(inprogress_counts / total_steps) * 100}%, rgb(217,95,2) ${(failed_counts / total_steps) * 100}%)`
            row.classList.add("CommitEntry")
            table.append(row)
        }
    }

    showStep(step, render_div) {
        let commit_row = render_div.querySelector(".popup")
        while (commit_row != null) {
            render_div.removeChild(commit_row)
            commit_row = render_div.querySelector(".popup")
        }
        let popup_div = document.createElement("div");
        popup_div.classList.add("popup")
        let stepName = document.createElement("h");
        stepName.textContent = step.name;
        let stepTable = document.createElement("table");
        stepTable.classList.add("stepTable")
        let r1 = document.createElement("tr")
        let e11 = document.createElement("th")
        e11.textContent = "Status: "
        let e12 = document.createElement("th");
        e12.textContent = step.conclusion
        if (step.conclusion == "success") {
            e12.classList.add("successStep")
        }
        else {
            if (step.status == "in_progress") {
                e12.classList.add("inProgressStep")
            } else {
                e12.classList.add("failedStep")
            }
        }
        r1.append(e11, e12)
        let r2 = document.createElement("tr")
        let e21 = document.createElement("th")
        e21.textContent = "Run Time: "
        let e22 = document.createElement("th");
        e22.textContent = this.convert_date(step.startTime) + " - " + this.convert_date(step.endTime)
        r2.append(e21, e22)
        stepTable.append(r1, r2)
        //Add the console
        let logsArea = document.createElement("textarea")
        logsArea.textContent = step.log;
        let exit_button = document.createElement("button")
        exit_button.type="button"
        exit_button.textContent = "X"
        exit_button.classList.add("exitButton")
        exit_button.onclick = () => {
            popup_div.classList.add("hide")
        }
        
        popup_div.append(stepName, stepTable, logsArea, exit_button)

        
        render_div.append(popup_div)

    }


    

    convert_date(d) {
        const date = new Date(d);
        const estDate = new Date(date.getTime() - (5 * 60 * 60 * 1000)); // Convert to EST
        const year = estDate.getUTCFullYear() % 100; // Get the full year
        const month = String(estDate.getUTCMonth() + 1).padStart(2, '0'); // Get month (1-12), pad with zero
        const day = String(estDate.getUTCDate()).padStart(2, '0'); // Get day (1-31), pad with zero
        let hours = String(estDate.getUTCHours()).padStart(2, '0'); // Format hour with leading zero
        const minutes = String(estDate.getUTCMinutes()).padStart(2, '0'); // Format minute with leading zero
        const seconds = String(estDate.getUTCSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12; // Convert to 12-hour format
        hours = hours ? hours : 12; // Hour 0 should be 12 for 12 AM
    
        return `${month}/${day}/${year} ${hours}:${minutes}:${seconds} ${ampm} EST`;
    }
}