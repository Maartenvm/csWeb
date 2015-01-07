﻿module csComp.Services {

    export class Widget {
        public content: Function;
        constructor() {

        }
    }

    export interface IWidget {
        directive : string;
        data : Object;
        title: string;
        elementId: string;
        dashboard: csComp.Services.Dashboard;
        renderer: Function;
        resize: Function;
        background : string;
        init: Function;
        start : Function;
        col: number; row: number; sizeY: number; sizeX: number; name: string; id: string;
        properties: {};
        dataSets: DataSet[];
        range: csComp.Services.DateRange;
        updateDateRange: Function;
        collapse: boolean;
        canCollapse : boolean;
        width: number;
        height: number;
        allowFullscreen: boolean;
        messageBusService: csComp.Services.MessageBusService;
        layerService: csComp.Services.LayerService;
    }

     

    export class BaseWidget implements IWidget {
        public directive : string;
        public title: string;
        public data : {};
        public elementId: string;
        public dashboard: csComp.Services.Dashboard;
        public col: number;
        public row: number;
        public background : string;
        public sizeY: number;
        public sizeX: number;
        public name: string; public id: string;
        public properties: {};
        public dataSets: DataSet[];
        public range: csComp.Services.DateRange;
        public collapse: boolean;
        public canCollapse : boolean;
        public width: number;
        public height: number;
        public allowFullscreen: boolean;
        public messageBusService: csComp.Services.MessageBusService;
        public layerService: csComp.Services.LayerService;

        //public static deserialize(input: IWidget): IWidget {
        //    var loader = new InstanceLoader(window);
        //    var w = <IWidget>loader.getInstance(widget.widgetType);
        //    var res = $.extend(new BaseWidget(), input);
        //    return res;
        //}

        constructor(title? : string, type? : string) {
           
            if (title) this.title = title;            
            this.properties = {};
            this.dataSets = [];

           

        }

   

        public start() {
            
        }

        public init() {
            //if (!sizeX) 
            //this.sizeX = sX;
            //this.sizeY = sY;
            //this.col = c;
            //this.row = r;
            this.background = "red";
            if (!this.id) this.id = "widget" + csComp.Helpers.getGuid().replace('-', '');
            //this.width = (width) ? width : 300;
            //this.height = (height) ? height : 150;            
            //this.id = id;
            this.elementId = this.id;
            this.start();

        }
        public renderer = ($compile : any,$scope: any) => { };

        public updateDateRange(r: csComp.Services.DateRange) {
            this.range = r;
        }

        public resize = (status: string, width : number, height : number) => {};
    }


    export class Dashboard {
        widgets: IWidget[];
        editMode: boolean;
        showMap: boolean;
        showTimeline: boolean = true;
        draggable: boolean = false;
        resizable: boolean = true;
        background: string;
        backgroundimage: string; 
        visiblelayers : string[];

        viewBounds: IBoundingBox;
        timeline: DateRange;
        id: string;
        name: string;            

        constructor() {
            this.widgets = [];
        }

        public static deserialize(input: Dashboard, dashboardService : DashboardService): Dashboard {
            var res = <Dashboard>$.extend(new Dashboard(), input);

            res.widgets = [];
            if (input.widgets) input.widgets.forEach((w: IWidget) => {
                dashboardService.addNewWidget(w, res);
            });
            if (input.timeline) res.timeline = $.extend(new DateRange(), input.timeline);
            
            return res;
        }
    }

    export class Timeline {
        public id : string;
        public timestamps : number[];
    }

    export class TimedDataSet {
        public timeline: Timeline;
        public timedata : number[];        
    }
    
    export class DataSet {      
        public color: string;
        
        public data: { [key: number]: number };

        constructor(public id?: string, public title?: string) {
            this.data = [];
        }

        


    }

} 