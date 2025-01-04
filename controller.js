export class webController {
    #model
    constructor(model) {
        this.#model = model
    }

    login(key) {
        this.#model.initialize(key)
        setInterval(() => this.update(), 300000)
        //setTimeout(() => this.update(), 10000)
    }

    getViewWorkflows(count) {
        console.log(this.#model.workflows[0])
        return this.#model.workflows.slice(0, count)
    }

    update() {
        console.log("Updating")
        this.#model.update()
    }

}