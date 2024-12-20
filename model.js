const e = "KO8/RzI7dK1y17WpEbvdKvDLTJGXlhm8SELJ812YTB9LRq11Dn80lH7BgMGGccR8EJ5Z6D172Q/JZDDT6MY5DBhzvJe7I+ZxTj0hxA4e1YKxOkPPabtBnfscNaKAnQjg"
export class webModel extends EventTarget {
    workflows = []
    #token
    constructor() {
        super()
    }

    async initialize(key) {

        const hashedKey = CryptoJS.SHA256(key).toString(CryptoJS.enc.Hex);
        const decryptedBytes = CryptoJS.AES.decrypt(e, CryptoJS.enc.Hex.parse(hashedKey), { mode: CryptoJS.mode.ECB });
        const decryptedMessage = decryptedBytes.toString(CryptoJS.enc.Utf8);
        this.#token = decryptedMessage
    
   
        try {
            const wfs = await this.checkWorkflows();
            for (let i = 0; i < wfs.length; i++) {
                const new_workflow = await workflow.createInstance(wfs[i].id, wfs[i].status, this.#token)
                this.workflows.push(new_workflow)
            }
            if (wfs.length == 0) {
                alert("No workflows Found")
            }
        } catch (error) {
            alert("Error Likely Wrong Username Password");
        }
        document.dispatchEvent(new Event("tabUpdate"))
    }


    async updateWorkflow(wf) {
        if (wf.status != "complete") {
            wf.update();
        }
    }

    async addNewWorkflows() {
        let newWorkflows = await this.checkWorkflows()
        let i = 0
        while (i < newWorkflows.length) {
            let found_index = -1
            let j = 0
            while (j < this.workflows.length) {
                if (newWorkflows[i].id == this.workflows[j].run_id) {
                    found_index = j
                    break
                }
                j += 1
            }
            if (found_index >= 0) {
                newWorkflows[i] = this.workflows[found_index];
            } else {
                newWorkflows[i] = await workflow.createInstance(newWorkflows[i].id, newWorkflows[i].status)
            }
            i += 1
        }
        document.dispatchEvent(new Event("tabUpdate"))
    }

    async checkWorkflows() {
        let response;
        try {
            response = await fetch('https://api.github.com/repos/mikerreed/pentrek/actions/runs?per_page=5', {
                method: 'GET',
                headers: {
                'Authorization': `token ${this.#token}`,
                'Accept': 'application/vnd.github.v3+json',
                },
            });

            if (!response.ok) {
                throw new Error(`GitHub API request failed with status: ${response.status}`);
            }

            const data = await response.json();
            // Filter workflows with the name "Testing"
            const filteredWorkflows = data.workflow_runs.filter(workflow => 
               workflow.name === "Testing"
            )
            // const filteredWorkflows = [];
            // let foundNonSuccess = false;
            // for (const workflow of data.workflow_runs) {
            //     if (workflow.name === "Testing") {
            //         if (workflow.status != "completed") {
            //             filteredWorkflows.push(workflow); // Add successful workflows
            //         } else if (!foundNonSuccess) {
            //             filteredWorkflows.push(workflow); // Add the first non-success workflow
            //             foundNonSuccess = true; // Ensure we only add the first non-success
            //         }
            //     }
            // }
            // Log the run IDs of the workflows that match the criteria
            const runIds = filteredWorkflows.map(workflow => ({
                id:workflow.id,
                status:workflow.status
            }));
            return runIds;  // Return the array of run IDs

        } catch (error) {
            console.log(response)
            console.log(response.headers.get('X-Accepted-GitHub-Permissions'))
            console.error('Error fetching workflows:', error);
            throw error;
        }
    }

    

    
}

class workflow extends EventTarget {
    //want step names and log and status  
    status  
    conclusion
    run_id
    steps
    head_sha
    #token
    start_time

    constructor(run_id, token) {
        super()
        this.run_id = run_id
        this.#token = token
    }

    static async createInstance(run_id, status, token) {
        this.status = status
        const jobInstance = new workflow(run_id, token);
        const data = await jobInstance.getJobIds(run_id)
        jobInstance.status = data.jobs[0].status
        jobInstance.conclusion = data.jobs[0].conclusion
        jobInstance.head_sha = data.jobs[0].head_sha
        jobInstance.start_time = new Date(data.jobs[0].started_at)
        jobInstance.steps = data.jobs[0].steps.map(step => ({
            name: step.name,
            status: step.status,
            conclusion: step.conclusion,
            startTime: step.started_at,
            endTime: step.completed_at,
            log: ""
        }));
        const log = await jobInstance.getJobLog(data.jobs[0].id);
        jobInstance.updateStepsLog(log);
        return jobInstance
    }

    async update() {
        //throws event if something changed
        const data = await this.getJobIds(run_id)
        const newSteps = data.jobs[0].map(step => ({
            name: step.name,
            status: step.status,
            conclusion: step.conclusion,
            startTime: step.started_at,
            endTime: step.completed_at,
            log: None
        }));
        
        for (let i = 0; i < newSteps.length; i++) {
            if (newSteps.status != "completed") {
                this.steps = newSteps;
                let log = await this.getJobLog(data.jobs[0].id);
                this.updateStepslog(log);
                document.dispatchEvent(new Event("workflowUpdate" + this.run_id))
                return;
            }
        }

        this.status = "completed"
        this.steps = newSteps;
        let log = await this.getJobLog(data.jobs[0].id);
        this.updateStepslog(log);
        document.dispatchEvent(new Event("workflowUpdate" + this.run_id))
        return;

    }

    async getJobIds(run_id) {
        try {
            const jobsResponse = await fetch(`https://api.github.com/repos/mikerreed/pentrek/actions/runs/${run_id}/jobs`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.#token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
        });

            if (!jobsResponse.ok) {
                throw new Error(`GitHub API request failed with status: ${jobsResponse.status}`);
            }

            const jobsData = await jobsResponse.json();
            return jobsData 
    
        } catch (error) {
            console.error('Error fetching job data:', error);
            throw error;
        }
    } 

    async getJobLog(job_id) {
        try {
            // Fetch the logs for the specific job
            const logsResponse = await fetch(`https://api.github.com/repos/mikerreed/pentrek/actions/jobs/${job_id}/logs`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.#token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            });
    
            if (!logsResponse.ok) {
                throw new Error(`Failed to fetch job logs for job ID ${job_id}`);
            }
    
            const logsData = await logsResponse.text();  // Job logs are in plain text format
            return logsData
    
        } catch (error) {
            console.error('Error fetching job logs:', error);
            throw error;
        }
    }

    updateStepsLog(log) {
        const logArray = log.split('\n')
        let i = 0
        let stepptr = 0
        while (i < logArray.length) {
            const timestampMatch = logArray[i].match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z)/);
            if (timestampMatch) {
                const timestamp = timestampMatch[1]; // Extract the timestamp part
                const date = new Date(timestamp); // Convert to Date object
                while (stepptr < this.steps.length - 1 && new Date(this.steps[stepptr + 1].startTime) < date) {
                    stepptr += 1
                }
                this.steps[stepptr].log = this.steps[stepptr].log + '\n' + logArray[i]
            } else {
                this.steps[stepptr].log = this.steps[stepptr].log + logArray[i]
            }
            i += 1
        }
    }
}