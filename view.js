export class webView {
    #model
    #view_workflow
    first_render
    #tab_buttons
    #steps_buttons
    #in_depth
    #leave_out_steps_set
    #workflow_live_step
    constructor(model) {
        this.#model = model
        this.first_render = true;
        this.#view_workflow
        this.#tab_buttons = []
        this.#steps_buttons = []
        this.#in_depth=false;
        this.#workflow_live_step = {}
        this.#leave_out_steps_set = new Set()//new Set(["Set up job", "Checkout code", "Install brew", "Install Cairo", "Install Bazel", "Post Checkout code", "Complete job", "sync"])
    }

    render_login(render_div) {
        const form = document.createElement('form');
        form.classList.add("login")
        const form_title = document.createElement('p');
        form_title.textContent = 'Pentrek Unit Testing'
        form.append(form_title)
        // Create Username Label and Input
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

        // Create Submit Button
        const submitButton = document.createElement('button');
        submitButton.setAttribute('type', 'submit');
        submitButton.textContent = 'Submit';
        form.appendChild(submitButton);
        form.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent the default form submission
            
            const key = keyInput.value;
            this.render(render_div)
            //to delete
            this.#model.initialize(key)
          });

        // Append the form to the body
        render_div.appendChild(form);
    }

    render(render_div) {
        render_div.innerHTML = ''
        const tab_header = document.createElement('div');
        tab_header.className = "tabHeader";
        const content_container = document.createElement('div')
        content_container.classList.add("contentContainer")
        const column1 = document.createElement('div')
        column1.classList.add("column", "left")
        const column2 = document.createElement('div')
        column2.classList.add("column", "right")
        const content2 = document.createElement('div')

        content2.classList.add("stepsContent")
        const content = document.createElement('div')
        column1.append(content, content2)
        content_container.append(column1, column2)
        render_div.append(tab_header, content_container);
        document.addEventListener("tabUpdate", (event) => {
            this.#view_workflow = this.#model.workflows[0];
            this.update_tabs(tab_header, content, content2, column2)
            if (this.first_render) {
                this.switch_content(content, content2, this.#model.workflows[0], column2);
                this.first_render = false;
            }
        })
    }

    update_tabs(tab_header, content, content2, column2) {
        tab_header.innerHTML = "";
        for (let wf of this.#model.workflows) {
            if (this.#workflow_live_step[wf.run_id] === undefined) {
                this.#workflow_live_step[wf.run_id] = 0
            }
            const tab_button = document.createElement('button')
            tab_button.textContent = this.convert_date(wf.start_time); 
            if (wf.conclusion == "success") {
                tab_button.className = "completed_tab"
            } else {
                if (wf.status == "in_progress") {
                    tab_button.classNmae = "inprogress_tab"
                } else {
                    tab_button.className = "noncompleted_tab"
                }
            }
            tab_button.classList.toggle("active", wf.run_id == this.#view_workflow.run_id)
            
            tab_button.classList.add("tab")

            tab_button.addEventListener("click", () => {
                this.switch_content(content, content2, wf, column2)
                for (let tb_data of this.#tab_buttons) {
                    if (tb_data.run_id == this.#view_workflow.run_id) {
                        tb_data.button.classList.add("active")
                    }
                    else {
                        tb_data.button.classList.remove("active")
                    }
                }
            });
            this.#tab_buttons.push({
                button:tab_button,
                run_id:wf.run_id
            })
            tab_header.append(tab_button)
        }
        let toggle_button = document.createElement("div");
        toggle_button.innerHTML =  `
        <div class="reallyYesOrNo">
            <div class="noooo">Minimal</div>
            <div class="yesss">Debug</div>
        </div>
        <div class="yeahhh">Minimal</div>
        <div class="yeahhh">Debug</div>
        `;
        toggle_button.classList.add("buttonHere");
        toggle_button.querySelector('.reallyYesOrNo').addEventListener('click', (e) => {
            e.preventDefault();
            toggle_button.querySelector('.reallyYesOrNo').classList.toggle('itsOkay')
            this.#in_depth = !this.#in_depth
            this.switch_content(content, content2, this.#view_workflow, column2)
        });

        tab_header.append(toggle_button)
    }

    switch_content(content, content2, wf, column2) {
        this.#view_workflow = wf
        content.innerHTML = "";
        content2.innerHTML = "";
        let wf_head_sha = document.createElement("p")
        wf_head_sha.innerHTML = `Commit Hash: ${wf.head_sha} <br>Workflow Status: ${wf.status} <br>Conclusion: ${wf.conclusion}`
        content.append(wf_head_sha)
        let stepBoxesFailed = []
        let stepBoxesSuccess = []
        for (let step of wf.steps) {
            if (this.#leave_out_steps_set.has(step.name)) {
                continue
            }
            let step_container = document.createElement("p")
            step_container.classList.add("stepContainer")
            let step_name = document.createElement("div")
            step_name.classList.add("containerHeader")
            step_name.textContent = step.name; 
            let step_status = document.createElement("p")
            step_status.textContent = "Status: " + step.status
            let step_conclusion = document.createElement("p")
            step_conclusion.textContent = "Conclusion: " + step.conclusion
            step_container.append(step_name, step_status, step_conclusion)
            if (step.conclusion == "success") {
                step_container.classList.add("successContainer")
                stepBoxesSuccess.push([step_container, step]);
            }
            else {
                if (step_container.status == "in_progress") {
                    step_container.classList.add("inProgressContainer")
                    stepBoxesFailed.push([step_container, step]);
                } else {
                    step_container.classList.add("failedContainer")
                    stepBoxesFailed.push([step_container, step]);
                }
            }
            step_container.addEventListener('click', ()=>{
                for (let cont of this.#steps_buttons) {
                    cont[0].classList.remove("active")
                }
                step_container.classList.add("active")
            
                this.select_step(step, column2)
            })
        }
        this.#steps_buttons = [...stepBoxesFailed, ...stepBoxesSuccess]
        let i = 0
        for (let cont of this.#steps_buttons) {
            content2.append(cont[0])
            const val = i
            cont[0].addEventListener('click', () => {
                this.#workflow_live_step[wf.run_id] = val;
            })
            i++;
        }
        this.#steps_buttons[this.#workflow_live_step[wf.run_id]][0].classList.add("active")
        this.select_step(this.#steps_buttons[this.#workflow_live_step[wf.run_id]][1], column2);
    }

    select_step(step, column2) {
        column2.innerHTML = '';
        let step_name = document.createElement("div")
        step_name.classList.add("containerHeader")
        step_name.textContent = step.name; 
        let step_status = document.createElement("p")
        step_status.textContent = "Status: " + step.status
        let step_conclusion = document.createElement("p")
        step_conclusion.textContent = "Conclusion: " + step.conclusion
        let step_be = document.createElement("p")
        step_be.textContent = "Time: " + this.convert_date(step.startTime) + "   ---   " + this.convert_date(step.endTime)
        let step_log = document.createElement("textarea")
        if (this.#in_depth) {
            step_log.textContent = step.log.replace(/^\n/, '')
        } else {
            step_log.textContent = step.log.replace(/^\n/, '').replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z)\s+/gm, '')
        }
        step_log.classList.add("stepLog")
        column2.append(step_name, step_status, step_conclusion, step_be, step_log)
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