import {webModel} from "./model.js";
import {webView} from "./view.js";
import {webController} from "./controller.js"


let model = new webModel();
let controller = new webController(model);
let view = new webView(controller);
view.render_login(document.getElementById('main'));