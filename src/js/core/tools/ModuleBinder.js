import * as coreModules from '../modules/core.js';
import TableRegistry from './TableRegistry.js';

export default class ModuleBinder extends TableRegistry {
	
	static moduleBindings = {};
	static modulesRegistered = false;

	static defaultModules = false;

	constructor(){
		super();
	}

	static initializeModuleBinder(defaultModules){
		if(!ModuleBinder.modulesRegistered){
			ModuleBinder.modulesRegistered = true;
			ModuleBinder._registerModules(coreModules, true);
			
			if(defaultModules){
				ModuleBinder._registerModules(defaultModules);
			}
		}
	}
	
	static _extendModule(name, property, values){
		if(ModuleBinder.moduleBindings[name]){
			var source = ModuleBinder.moduleBindings[name][property];
			
			if(source){
				if(typeof values == "object"){
					for(let key in values){
						source[key] = values[key];
					}
				}else{
					console.warn("Module Error - Invalid value type, it must be an object");
				}
			}else{
				console.warn("Module Error - property does not exist:", property);
			}
		}else{
			console.warn("Module Error - module does not exist:", name);
		}
	}

	static _registerModules(modules, core){
		var mods = Object.values(modules);
		
		if(core){
			mods.forEach((mod) => {
				mod.prototype.moduleCore = true;
			});
		}
		
		ModuleBinder._registerModule(mods);
	}
	
	static _registerModule(modules){
		if(!Array.isArray(modules)){
			modules = [modules];
		}
		
		modules.forEach((mod) => {
			ModuleBinder._registerModuleBinding(mod);
		});
	}

	static _registerModuleBinding(mod){
		ModuleBinder.moduleBindings[mod.moduleName] = mod;
	}

	
	//ensure that module are bound to instantiated function
	_bindModules(){
		var orderedStartMods = [],
		orderedEndMods = [],
		unOrderedMods = [];
		
		this.modules = {};
		
		for(var name in ModuleBinder.moduleBindings){
			let mod = ModuleBinder.moduleBindings[name];
			let module = new mod(this);
			
			this.modules[name] = module;
			
			if(mod.prototype.moduleCore){
				this.modulesCore.push(module);
			}else{
				if(mod.moduleInitOrder){
					if(mod.moduleInitOrder < 0){
						orderedStartMods.push(module);
					}else{
						orderedEndMods.push(module);
					}
					
				}else{
					unOrderedMods.push(module);
				}
			}
		}
		
		orderedStartMods.sort((a, b) => a.moduleInitOrder > b.moduleInitOrder ? 1 : -1);
		orderedEndMods.sort((a, b) => a.moduleInitOrder > b.moduleInitOrder ? 1 : -1);
		
		this.modulesRegular = orderedStartMods.concat(unOrderedMods.concat(orderedEndMods));
	}
}