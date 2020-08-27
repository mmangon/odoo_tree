odoo.define('ag_tree.Field', function(require){
    "use strict";
    var fieldRegistry = require('web.field_registry');
    var relationalFields = require('web.relational_fields');

    var AmbigroupOne2ManyTree = relationalFields.FieldOne2Many.extend({
        template: 'AgTree',
        widget_class: "o_ag_tree",
        
        /**
         * @override
         */
        init: function () {
            this._super.apply(this, arguments);
            this.init_args();
            // boolean used to prevent concurrent record creation
            this.creatingRecord = false;
        },

        init_args: function(){
            console.log(this)
            this.agTree = [];
            this.agTree.data = this.recordData[this.name].data;
            this.agTree.fieldsInfo = this.recordData[this.name].fieldsInfo;
            if (this.agTree.data.length != 0){
                this.init_options();
                this.format_data();
            }
        },

        init_options: function(){
            var dataInfo = {}
            var agTreeData = this.agTree.data;
            var agTreeFieldsInfo = this.agTree.fieldsInfo;
            var displayFields = agTreeData[0].data;
            this.agTree.parent = this.attrs.options.parent_field;
            this.agTree.separator = this.attrs.options.separator || " ";
            this.agTree.clickable = this.attrs.options.clickable || true;
            this.agTree.gridOption = this.attrs.options.grid || false;
            this.agTree.analyticFields = this.attrs.options.analytic_fields || false;
            var self = this;
            if(this.agTree.parent === undefined ){
                console.warn("[ag_tree] No parent defined on tree options, default parent is parent_id");
                this.agTree.parent = "parent_id";
            }
            if(displayFields === undefined ){
                console.warn("[ag_tree] No display fields defined on tree options, default field is id");
                displayFields = ["id"];
            }
            $.each(displayFields, function(k, v){
                if(agTreeData[0].fields[k] === undefined){
                    console.warn('[ag_tree] Field ' + k + " is not define on view, field avoided");
                }
                else{
                    if (self.agTree.gridOption == true){
                        var invisible = agTreeFieldsInfo.list[k].invisible || 0;
                        if(invisible == 0){
                            dataInfo[k] = {
                                'type': agTreeData[0].fields[k].type,
                                'width': parseInt(agTreeFieldsInfo.list[k].ag_tree_width) || 10,
                                'string': agTreeData[0].fields[k].string,
                            }
                        }
                    }else{
                        dataInfo[k] = agTreeData[0].fields[k].type;
                    }
                }
            });
            this.agTree.dataInfo = dataInfo;
        },

        format_data: function(){
            var dataInfo = this.agTree.dataInfo;
            var data = this.agTree.data;
            var finalData = [];
            var agTreeParent = this.agTree.parent;
            var gridColumnsData = [];
            var agTreeSeparator = this.agTree.separator || " ";
            var agTreeFieldsInfo = this.agTree.fieldsInfo || null;
            if (this.agTree.gridOption == false){
                $.each(data, function(kD, vD){
                    var displayTextArray = [];
                    var parent = "#";
                    if (data[kD].data[agTreeParent]){
                        parent = data[kD].data[agTreeParent].data['id'];
                    }
                    $.each(dataInfo, function(kT, vT){
                        if(dataInfo[kT] == "many2one"){
                            if (data[kD].data[kT]){
                                displayTextArray.push(data[kD].data[kT].data['display_name']);
                            }
                        }else{
                            var invisible = agTreeFieldsInfo.list[kT].invisible || 0;
                            if(invisible == 0){
                                displayTextArray.push(data[kD].data[kT]);
                            }
                        }
                        
                    }); 
                    var displayData = {"text" : displayTextArray.join(agTreeSeparator), "id": "" + data[kD].data['id'], "parent": "" + parent};
                    finalData.push(displayData);
                });
            }else{
                $.each(data, function(kD, vD){
                    var displayText = "";
                    var parent = "#";
                    var cloneDataInfo = {};
                    Object.assign(cloneDataInfo, dataInfo);
                    if (data[kD].data[agTreeParent]){
                        parent = data[kD].data[agTreeParent].data['id'];
                    }
                    var firstKey = Object.keys(dataInfo)[0];
                    if(dataInfo[firstKey]["type"] == "many2one"){
                        if (data[kD].data[firstKey]){
                            displayText = data[kD].data[firstKey].data['display_name'];
                        }
                    }else{
                        displayText = data[kD].data[firstKey];
                    }
                    var displayData = {
                        "text" : displayText, 
                        "id": "" + data[kD].data['id'], 
                        "parent": "" + parent
                    };
                    delete cloneDataInfo[firstKey];
                    displayData["data"] = {}
                    $.each(cloneDataInfo, function(k, v){
                        if(cloneDataInfo[k]["type"] == "many2one"){
                            if (data[kD].data[k]){
                                displayData["data"][k] = data[kD].data[k].data['display_name']
                            }
                        }else{
                            displayData["data"][k] = Math.round(data[kD].data[k] * 100) / 100;
                        }
                    });
                    finalData.push(displayData);
                });
                $.each(dataInfo, function(k, v){
                    var columnData = {
                        "width": dataInfo[k]["width"],
                        "header": dataInfo[k]["string"],
                        "value": k,
                    };
                    gridColumnsData.push(columnData);
                });
                this.agTree.gridColumnsData = gridColumnsData;
            }
            this.source = finalData;
            if (this.agTree.analyticFields){
                var _this = this;
                $.each(_this.agTree.analyticFields, function(k, v){
                    if (_this.agTree.dataInfo[v].type != "integer" && _this.agTree.dataInfo[v].type != "float"){
                        console.warn("[ag_tree] Field " + v +" is not a number");
                    }else{
                        var lastNodes = _this.getLastNode(v);
                        var newData = _this.recursiveCalc(lastNodes);
                        finalData = _this.replaceCalcValue(finalData, newData, v);
                        _this.source = finalData;
                    }
                });
            }
        },

        getLastNode: function(field){
            var source = this.source
            var data = [];
            var parentData = [];
            var lastNode = [];
            $.each(source, function(k, v){
                var dict = {};
                dict[v.id] = {
                    "parentID": v.parent,
                    "value": v.data[field]
                };
                data.push(dict);
                if(v.parent != "#"){
                    if(!parentData.includes(v.parent)){
                        parentData.push(v.parent)
                    }
                }
            });
            lastNode = data.filter(function(element){
                var a = "";
                $.each(element, function(k, v){
                    a = !parentData.includes(k);
                });
                return a;
            });
            return lastNode;
        },

        recursiveCalc: function(lastNodes){
            var env = this;
            var result = [];
            while (lastNodes.length != 0){
                var nextData = {};
                $.each(lastNodes, function(kNode, vNode){
                    $.each(vNode, function(k, v){
                        var dict = {};
                        dict[k] = v.value;
                        var test = result.find(x => x[k]);
                        if (test){
                            var index = result.indexOf(test);
                            result[index][k] += v.value;
                        }else{
                            result.push(dict);
                        }
                        if (v.parentID != "#"){
                            var nextValue = env.getNextValue(nextData, v);
                            nextData[v.parentID] = {
                                "parentID": "#",
                                "value": nextValue,
                            };
                        }
                    });
                });
                lastNodes = this.getNextParent(nextData);
            }
            return result;
        },

        getNextValue: function(nextData, v){
            if (nextData[v.parentID]){
                return nextData[v.parentID].value + v.value;
            }else{
                return v.value;
            }
        },

        getNextParent: function(nextData){
            var data = this.source;
            var nextListNodes = [];
            $.each(nextData, function(k, v){
                var dataLine = data.filter(x => x.id==k);
                if(dataLine[0].parent != "#"){
                    nextData[k].parentID = dataLine[0].parent;
                }
            });
            $.each(nextData, function(k, v){
                var tmpDict = {};
                tmpDict[k] = v
                nextListNodes.push(tmpDict);
            });
            return nextListNodes;
        },

        replaceCalcValue: function(finalData, newData, field){
            $.each(newData, function(k, v){
                var key = Object.keys(v)[0];
                var obj = finalData.find(x => x.id == parseInt(Object.keys(v)[0]));
                obj.data[field] = Math.round(v[key] * 100) / 100;
            });
            return finalData;
        },

        _render: function(){
            this._super.apply(this, arguments);
            if (this.agTree.data.length != 0){
                var tree;
                if (this.agTree.clickable == true){
                    var node = this;
                    var resModel = this.recordData[this.name].model;
                    tree = this.$el.find('div#tree').on('changed.jstree', function(e, data){
                        node.do_action({
                            type: 'ir.actions.act_window',
                            view_type: 'form',
                            view_mode: 'form',
                            views: [[false, 'form']],
                            target: 'current',
                            res_model: resModel,
                            res_id: parseInt(data.node.id)
                        });
                    })
                }else{
                    tree = this.$el.find('div#tree')
                }
                if (this.agTree.gridOption == true){
                    tree.jstree({
                        'plugins' : ["core", "grid"],
                        'core' : { 
                            animation: 0,
                            data : this.source,
                        },
                        'grid' : {
                            columns: this.agTree.gridColumnsData,
                        },
                    });
                }else{
                    tree.jstree({
                        'core' : {
                            'data' : this.source,
                        }
                    });
                }
            }else{
                this.$el.find('div#tree').html("<p class='no_data_display'>No data to display</p>");
            }
            
        },
    });

    fieldRegistry.add('ag_tree_o2m', AmbigroupOne2ManyTree);

    var AmbigroupMany2OneTreeGrid = relationalFields.FieldMany2One.extend({
        template: 'AgTreeM2O',
        
        init: function(){
            this._super.apply(this, arguments);
            this.agTree = [];
        },
        
        /**
         * Override for disable the autocomplete option
         */
        _onAutoComplete: function(){
            return {
                source: function (req, resp) {
                },
                select: function (event, ui) {
                },
                focus: function (event) {
                    event.preventDefault(); // don't automatically select values on focus
                },
                close: function (event) {
                },
                autoFocus: false,
                html: false,
                minLength: 0,
            }
        },

        _renderEdit: async function () {
            var self = this;
            var a = this.$el.find('div#tree');
            this.agTree.jsonResult = await this._rpc({
                route: '/ag_tree/get_account',
            });
            a.on("changed.jstree", function(e, data) {
                var children_ids = data.node.children;
                if (children_ids.length == 0){
                    var value = {
                        "id": data.node.id,
                        "display_name": data.node.text,
                    }
                    self._setValue(value);
                }
            }).jstree({
                'plugins' : ["core", "search"],
                'core' : { 
                    animation: 0,
                    data : this.agTree.jsonResult,
                },
            });
            $('#' + this.$input[0].id).autocomplete(this._onAutoComplete());
            $('#' + this.$input[0].id).bind('change paste keyup', function(e){
                var text = self.$input[0].value;
                self.$el.find('div#tree').jstree(true).search(text);
            });
        },

        /**
         * Override for disable the create option
         */
        _onInputFocusout: function () {
        },

    });

    fieldRegistry.add('ag_tree_m2o', AmbigroupMany2OneTreeGrid);
});
