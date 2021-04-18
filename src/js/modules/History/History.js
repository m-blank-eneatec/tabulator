import Module from '../../core/Module.js';

import defaultUndoers from './defaults/undoers.js';
import defaultRedoers from './defaults/redoers.js';

class History extends Module{

	constructor(table){
		super(table);

		this.history = [];
		this.index = -1;

		this.registerTableOption("history", false); //enable edit history
	}

	initialize(){
		if(this.table.options.history){
			this.subscribe("cell-value-updated", this.layoutCell.bind(this));
			this.subscribe("cell-delete", this.clearComponentHistory.bind(this));
			this.subscribe("row-delete", this.rowDeleted.bind(this));
			this.subscribe("rows-wipe", this.clear.bind(this));
			this.subscribe("row-added", this.clear.bind(this));
			this.subscribe("row-move", this.rowMoved.bind(this));
		}

		this.registerTableFunction("undo", this.undo.bind(this));
		this.registerTableFunction("redo", this.redo.bind(this));
		this.registerTableFunction("getHistoryUndoSize", this.getHistoryUndoSize.bind(this));
		this.registerTableFunction("getHistoryRedoSize", this.getHistoryRedoSize.bind(this));
		this.registerTableFunction("clearHistory", this.clear.bind(this));
	}

	rowMoved(from, to, after){
		this.action("rowMove", from, {posFrom:this.table.rowManager.getRowPosition(from), posTo:this.table.rowManager.getRowPosition(to), to:to, after:after});
	}

	rowAdded(row, data, pos, index){
		this.action("rowAdd", row, {data:data, pos:pos, index:index});
	}

	rowDeleted(row){
		var index, rows;

		if(this.table.options.groupBy){

			rows = row.getComponent().getGroup().rows
			index = rows.indexOf(row);

			if(index){
				index = rows[index-1];
			}
		}else{
			index = row.table.rowManager.getRowIndex(row);

			if(index){
				index = row.table.rowManager.rows[index-1];
			}
		}

		this.history.action("rowDelete", row, {data:row.getData(), pos:!index, index:index});
	}

	cellUpdated(cell){
		this.action("cellEdit", cell, {oldValue:cell.oldValue, newValue:cell.value});
	}

	clear(){
		this.history = [];
		this.index = -1;
	}

	action(type, component, data){
		this.history = this.history.slice(0, this.index + 1);

		this.history.push({
			type:type,
			component:component,
			data:data,
		});

		this.index ++;
	}

	getHistoryUndoSize(){
		return this.index + 1;
	}

	getHistoryRedoSize(){
		return this.history.length - (this.index + 1);
	}

	clearComponentHistory(component){
		var index = this.history.findIndex(function(item){
			return item.component === component;
		});

		if(index > -1){
			this.history.splice(index, 1);
			if(index <= this.index){
				this.index--;
			}

			this.clearComponentHistory(component);
		}
	}

	undo(){
		if(this.index > -1){
			let action = this.history[this.index];

			History.undoers[action.type].call(this, action);

			this.index--;

			this.dispatchExternal("historyUndo", action.type, action.component.getComponent(), action.data);

			return true;
		}else{
			console.warn("History Undo Error - No more history to undo");
			return false;
		}
	}

	redo(){
		if(this.history.length-1 > this.index){

			this.index++;

			let action = this.history[this.index];

			History.redoers[action.type].call(this, action);

			this.dispatchExternal("historyRedo", action.type, action.component.getComponent(), action.data);

			return true;
		}else{
			console.warn("History Redo Error - No more history to redo");
			return false;
		}
	}

	//rebind rows to new element after deletion
	_rebindRow(oldRow, newRow){
		this.history.forEach(function(action){
			if(action.component instanceof Row){
				if(action.component === oldRow){
					action.component = newRow;
				}
			}else if(action.component instanceof Cell){
				if(action.component.row === oldRow){
					var field = action.component.column.getField();

					if(field){
						action.component = newRow.getCell(field);
					}

				}
			}
		});
	}
}

History.moduleName = "history";

//load defaults
History.undoers = defaultUndoers;
History.redoers = defaultRedoers;

export default History;