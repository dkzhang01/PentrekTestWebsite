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
            console.log(wfs)
            for (let i = 0; i < wfs.length; i++) {
                const new_workflow = await workflow.createInstance(wfs[i].id, wfs[i].status, wfs[i].commitID, wfs[i].displayTitle, wfs[i].committer, wfs[i].commitDate, this.#token)
                this.workflows.push(new_workflow)
            }
            if (wfs.length == 0) {
                alert("No workflows Found")
            }
        } catch (error) {
            console.log(error)
            alert("Error Likely Wrong Username Password");
        }
        document.dispatchEvent(new Event("update"))
    }

    async update() {
        let newWorkflows = await this.checkWorkflows();
        const existingWorkflows = this.workflows.map(workflow => workflow.run_id)
        console.log(newWorkflows)
        console.log(existingWorkflows)
        for (let newWFD of newWorkflows) {
            if (existingWorkflows.indexOf(newWFD.id) > -1) {
                if ((this.workflows[existingWorkflows.indexOf(newWFD.id)].status != "completed")) {
                    this.workflows[existingWorkflows.indexOf(newWFD.id)].update()
                }
            } else {
                this.workflows.push(await workflow.createInstance(newWFD.id, newWFD.status, newWFD.commitID, newWFD.displayTitle, newWFD.committer, newWFD.commitDate, this.#token))
            }
        }

        this.workflows.sort((a, b) => {
            let datea = new Date(a.startTime)
            let dateb = new Date(b.startTime)
            if (datea < dateb) {
                return -1
            } else {
                return 1
            }
        })

        document.dispatchEvent(new Event("update"))
    }

    async checkWorkflows(count) {
        let response;
        if (count == null) {
            count = 30
        }
        try {
            response = await fetch('https://api.github.com/repos/mikerreed/pentrek/actions/runs?per_page=' + count, {
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
            console.log(data)
            // Filter workflows with the name "Testing"
            const filteredWorkflows = data.workflow_runs.filter(workflow => 
               workflow.name === "Testing"
            )
            
            const runIds = filteredWorkflows.map(workflow => ({
                id:workflow.id,
                status:workflow.status,
                committer: workflow.head_commit.author,
                commitDate: workflow.head_commit.timestamp,
                commitID:workflow.head_commit.id,
                displayTitle:workflow.head_commit.message
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
    display_title
    committer
    commitDate
    #token
    start_time

    constructor(run_id, token) {
        super()
        this.run_id = run_id
        this.#token = token
    }

    static async createInstance(run_id, status, commitID, displayTitle, committer, commitDate, token) {
        this.status = status
        const jobInstance = new workflow(run_id, token);
        const data = await jobInstance.getJobIds(run_id)
        jobInstance.status = data.jobs[0].status
        jobInstance.conclusion = data.jobs[0].conclusion
        jobInstance.head_sha = commitID
        jobInstance.display_title = displayTitle
        jobInstance.committer = committer
        jobInstance.commitDate = commitDate
        jobInstance.start_time = new Date(data.jobs[0].started_at)
        if (status != "queued") {
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
        }
        return jobInstance
    }

    async update() {
        const data = await this.getJobIds(this.run_id)
        this.steps = data.jobs[0].steps.map(step => ({
            name: step.name,
            status: step.status,
            conclusion: step.conclusion,
            startTime: step.started_at,
            endTime: step.completed_at,
            log: ""
        }));
        const log = await this.getJobLog(data.jobs[0].id);
        this.updateStepsLog(log);
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
        let logs_by_step = [""]
        for (let i = 0; i < logArray.length; i++) {
            if (logArray[i].replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z)/, "").trim() == "[!#-StartStep-#!]") {
                logs_by_step.push("")
            } else if (logArray[i].replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z)/, "").trim() == "[!#-EndStep-#!]"){
                while (logArray[i].replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z)/, "").trim() != "[!#-StartStep-#!]") {
                    i += 1
                }
                i -= 1;
            } else if (logArray[i].replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z)/, "").trim() == "Post job cleanup.") {
                break;
            }
            logs_by_step[logs_by_step.length - 1] += logArray[i] + '\n'
        }

        let j = 0
        while (this.steps[j].name != "Install brew") {
            j += 1;
        }
        let k = 0
        while (k + 1 < logs_by_step.length) {
            this.steps[j].log = logs_by_step[k + 1];
            j += 1;
            k += 1;
        }
    }
}