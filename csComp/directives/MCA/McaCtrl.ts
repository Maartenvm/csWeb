﻿module Mca {
    'use strict';

    // TODO Ignore MCA calculation when too many criteria are out of (cut-off) range or not present. ???

    // TODO Add MCA properties to tooltip

    // TODO Add message in LegendCtrl to check whether a FeatureId is still in use:
    // TODO - hide the legend icon when not in use
    // TODO - send a message which feature ids are in use
    // TODO - McaCtrl should remove all MCA that are not in use.

    // TODO Add Heatmap option:
    // TODO - Use MCA as is, but instead of a scoring function, use a distance function (each selected feature on the map has an area of influence)
    // TODO - Add the (Gaussian-shaped) influence areas and create a heatmap (see also: geotrellis.io)

    // TODO Add an option to compare your score with other scores (Set filter: +- 5%).

    // TODO?? Add sensitivity analysis

    // TODO Add a propertyType that links to another GeoJSON file, e.g. click on Den Haag in gemeente.json, show option to load DenHaagWijken.json.
    // TODO Disable/unload a layer when outside a zoom range, and load it when inside a zoom range.
    // TODO Create a function that determines which geojson to load based on the current extent and zoom level.


    import Feature       = csComp.Services.Feature;
    import IFeature      = csComp.Services.IFeature;
    import IFeatureType  = csComp.Services.IFeatureType;
    import IPropertyType = csComp.Services.IPropertyType;

    export interface IMcaScope extends ng.IScope {
        vm: McaCtrl;
        ratingStates: any;
    }

    declare var String;//: csComp.StringExt.IStringExt;

    export class McaCtrl {
        private static mcaChartId = 'mcaChart';
        private static mcas = 'MCAs';
        private static confirmationMsg1: string;
        private static confirmationMsg2: string;

        features: IFeature[] = [];

        selectedFeature: IFeature;
        properties     : FeatureProps.CallOutProperty[];
        showFeature    : boolean;
        showChart      : boolean;
        featureIcon    : string;

        mca              : Models.Mca;
        selectedCriterion: Models.Criterion;
        availableMcas    : Models.Mca[] = [];

        showAsterChart = false;  // When true, show a pie chart, when false, show a bar chart.
        showDialog     = false;
        expertMode     = false;
        showSparkline  = false;

        private groupStyle: csComp.Services.GroupStyle;

        static $inject = [
            '$scope',
            '$modal',
            '$translate',
            '$timeout',
            'localStorageService',
            'layerService',
            'messageBusService'
        ];

        constructor(
            private $scope              : IMcaScope,
            private $modal              : any,
            private $translate          : ng.translate.ITranslateService,
            private $timeout            : ng.ITimeoutService,
            private $localStorageService: ng.localStorage.ILocalStorageService,
            private $layerService       : csComp.Services.LayerService,
            private messageBusService   : csComp.Services.MessageBusService
            ) {
            $scope.vm = this;

            messageBusService.subscribe('layer', (title) => {//, layer: csComp.Services.ProjectLayer) => {
                switch (title) {
                    case 'deactivate':
                    case 'activated':
                        this.updateAvailableMcas();
                        this.calculateMca();
                        break;
                }
            });

            messageBusService.subscribe('project', (title) => {//, layer: csComp.Services.ProjectLayer) => {
                switch (title) {
                    case 'loaded':
                        this.expertMode = $layerService.project != null
                            && $layerService.project.hasOwnProperty('userPrivileges')
                            && $layerService.project.userPrivileges.hasOwnProperty('mca')
                            && $layerService.project.userPrivileges.mca.hasOwnProperty('expertMode')
                            && $layerService.project.userPrivileges.mca.expertMode;

                       if (typeof $layerService.project.mcas === 'undefined' || $layerService.project.mcas == null)
                            $layerService.project.mcas = [];
                        var mcas = this.$localStorageService.get(McaCtrl.mcas);
                        if (typeof mcas === 'undefined' || mcas === null) return;
                        mcas.forEach((mca) => {
                            $layerService.project.mcas.push(new Models.Mca().deserialize(mca));
                        });
                        //this.createDummyMca();
                        break;
                }
            });

            messageBusService.subscribe('feature', this.featureMessageReceived);

            $translate('MCA.DELETE_MSG').then(translation => {
                McaCtrl.confirmationMsg1 = translation;
            });
            $translate('MCA.DELETE_MSG2').then(translation => {
                McaCtrl.confirmationMsg2 = translation;
            });
        }

        private getVotingClass(criterion: Models.Criterion) {
            if (criterion == null || this.mca == null || criterion.userWeight === 0 || criterion.userWeight < -this.mca.userWeightMax || criterion.userWeight > this.mca.userWeightMax)
                return 'disabledMca';
            return criterion.userWeight > 0 ? 'prefer' : 'avoid';
        }

        private createDummyMca() {
            var mca             = new Models.Mca();
            mca.title           = 'Mijn Zelfredzaamheid';
            mca.description     = 'Analyse van de zelfredzaamheid van een gemeente.';
            mca.label           = 'mca_zelfredzaamheid';
            mca.stringFormat    = '{0:0.0}';
            mca.rankTitle       = 'Positie';
            mca.rankDescription = 'Relatieve positie in de lijst.';
            mca.rankFormat      = '{0} van {1}';
            mca.userWeightMax   = 5;
            mca.featureIds      = ['cities_Default'];

            var criterion        = new Models.Criterion();
            criterion.label      = 'p_00_14_jr';
            criterion.scores     = '[0,0 20,1]';
            criterion.userWeight = 1;
            mca.criteria.push(criterion);

            criterion            = new Models.Criterion();
            criterion.label      = 'p_15_24_jr';
            criterion.scores     = '[0,0 20,1]';
            criterion.userWeight = 1;
            mca.criteria.push(criterion);

            criterion            = new Models.Criterion();
            criterion.label      = 'p_65_eo_jr';
            criterion.scores     = '[0,0 25,1]';
            criterion.userWeight = 3;
            mca.criteria.push(criterion);
            this.$layerService.project.mcas.push(mca);

            mca               = new Models.Mca();
            mca.title         = 'test';
            mca.label         = 'mca_test';
            mca.stringFormat  = '{0:0.0}';
            mca.rankTitle     = 'Rang';
            mca.rankFormat    = '{0} van {1}';
            mca.userWeightMax = 3;
            mca.featureIds    = ['cities_Default'];

            criterion            = new Models.Criterion();
            criterion.label      = 'p_15_24_jr';
            criterion.scores     = '[0,0 20,1]';
            criterion.userWeight = 1;
            mca.criteria.push(criterion);

            criterion            = new Models.Criterion();
            criterion.label      = 'p_65_eo_jr';
            criterion.scores     = '[0,0 25,1]';
            criterion.userWeight = 3;
            mca.criteria.push(criterion);
            this.$layerService.project.mcas.push(mca);
        }

        toggleMcaChartType() {
            this.showAsterChart = !this.showAsterChart;
            this.drawChart(this.mca.criteria[0]);
        }

        toggleSparkline() {
            this.showSparkline = !this.showSparkline;
            if (this.showSparkline) this.drawChart();
        }

        weightUpdated(criterion: Models.Criterion) {
            this.selectedCriterion = criterion;
            this.addMca(this.mca);
            this.updateMca(criterion);
        }

        updateMca(criterion?: Models.Criterion) {
            this.selectedCriterion = criterion;
            this.features = [];
            this.calculateMca();
            this.drawChart(criterion);
        }

        editMca(mca: Models.Mca) {
            this.showMcaEditor(mca);
        }

        createMca() {
            this.showMcaEditor(new Models.Mca());
        }

        private showMcaEditor(newMca: Models.Mca): void {
            var modalInstance = this.$modal.open({
                templateUrl: 'directives/MCA/McaEditorView.tpl.html',
                controller: McaEditorCtrl,
                resolve: {
                    mca: () => newMca
                }
            });
            modalInstance.result.then((mca: Models.Mca) => {
                this.showSparkline = false;
                this.addMca(mca);
                this.updateMca();
                //console.log(JSON.stringify(mca, null, 2));
            }, () => {
                //console.log('Modal dismissed at: ' + new Date());
            });
        }

        removeMca(mca: Models.Mca) {
            if (!mca) return;
            var title = String.format(McaCtrl.confirmationMsg1, mca.title);
            this.messageBusService.confirm(title, McaCtrl.confirmationMsg2, (result) => {
                if (!result) return;
                this.$timeout(() => {
                    this.deleteMca(mca);
                    if (this.mca) this.updateMca();
                }, 0);
            });
            this.scopeApply();
        }

        private getMcaIndex(mca: Models.Mca): number {
            var mcaIndex = -1;
            var mcas = this.$layerService.project.mcas;
            for (var i = 0; i < mcas.length; i++) {
                if (mcas[i].title !== mca.title) continue;
                mcaIndex = i;
                break;
            }
            return mcaIndex;
        }

        private addMca(mca: Models.Mca) {
            if (!mca) return;
            this.deleteMca(mca);
            this.$layerService.project.mcas.push(mca);
            this.addMcaToLocalStorage(mca);
            this.updateAvailableMcas(mca);
        }

        private deleteMca(mca: Models.Mca) {
            if (!mca) return;
            var mcaIndex = this.getMcaIndex(mca);
            if (mcaIndex < 0) return;
            var mcas = this.$layerService.project.mcas;
            if (mcaIndex >= 0)
                mcas.splice(mcaIndex, 1);
            this.removeMcaFromLocalStorage(mca);
            this.updateAvailableMcas();
        }

        private addMcaToLocalStorage(mca: Models.Mca) {
            var mcas: Models.Mca[] = this.$localStorageService.get(McaCtrl.mcas);
            if (typeof mcas === 'undefined' || mcas === null) mcas = [];
            this.removeMcaFromLocalStorage(mca);
            mcas.push(mca);
            this.$localStorageService.set(McaCtrl.mcas, mcas); // You first need to set the key
        }

        private removeMcaFromLocalStorage(mca: Models.Mca) {
            var mcas: Models.Mca[] = this.$localStorageService.get(McaCtrl.mcas);
            if (typeof mcas === 'undefined' || mcas === null) return;
            var mcaIndex = -1;
            for (var i = 0; i < mcas.length; i++) {
                if (mcas[i].title !== mca.title) continue;
                mcaIndex = i;
                break;
            }
            if (mcaIndex < 0) return;
            mcas.splice(mcaIndex, 1);
            this.$localStorageService.set(McaCtrl.mcas, mcas); // You first need to set the key
        }

        public featureMessageReceived = (title: string, feature: IFeature): void => {
            //console.log("MC: featureMessageReceived");
            if (this.mca == null) return;
            switch (title) {
            case 'onFeatureSelect':
                this.updateSelectedFeature(feature, true);
                break;
            case 'onFeatureDeselect':
                this.showFeature = false;
                this.selectedFeature = null;
                this.drawChart();
                break;
            default:
                //console.log(title);
                break;
            }
            this.scopeApply();
        }

        private scopeApply() {
            if (this.$scope.$root.$$phase !== '$apply' && this.$scope.$root.$$phase !== '$digest') {
                this.$scope.$apply();
            }
        }

        private updateSelectedFeature(feature: IFeature, drawCharts = false) {
            if (typeof feature === 'undefined' || feature == null) {
                this.featureIcon = '';
                return;
            }
            this.selectedFeature = feature;
            this.featureIcon = this.selectedFeature.fType != null && this.selectedFeature.fType.style != null
                ? this.selectedFeature.fType.style.iconUri
                : '';
            if (!feature.properties.hasOwnProperty(this.mca.label)) return;

            this.showFeature = true;
            this.properties = [];
            var mi = McaCtrl.createPropertyType(this.mca);
            var displayValue = csComp.Helpers.convertPropertyInfo(mi, feature.properties[mi.label]);
            this.properties.push(new FeatureProps.CallOutProperty(mi.title, displayValue, mi.label, true, true, feature, false, false, mi.description, mi));
            if (this.mca.rankTitle) {
                mi = McaCtrl.createRankPropertyType(this.mca);
                displayValue = csComp.Helpers.convertPropertyInfo(mi, feature.properties[mi.label]);
                this.properties.push(new FeatureProps.CallOutProperty(mi.title, displayValue, mi.label, false, false, feature, false, false, mi.description, mi));
            }
            if (drawCharts) this.drawChart();
        }

        drawChart(criterion?: Models.Criterion) {
            this.selectedCriterion = criterion;
            this.showChart = true;
            if (this.showFeature)
                if (this.showAsterChart)
                    this.drawAsterPlot(criterion);
                else
                    this.drawHistogram(criterion);

            else
                this.drawPieChart(criterion);

            if (!this.showSparkline) return;

            var i = 0;
            this.mca.criteria.forEach((crit) => {
                var id = 'histogram_' + i++;
                if (crit.criteria.length === 0) {
                    var y1 = crit.y;
                    if (crit.userWeight < 0) y1 = y1.map((v) => 1 - v);
                    csComp.Helpers.Plot.drawMcaPlot(crit.propValues, {
                        id              : id,
                        width           : 220,
                        height          : 70,
                        xy              : { x: crit.x, y: y1 },
                        featureValue    : this.selectedFeature ? this.selectedFeature.properties[crit.label] : null
                    });
                } else {
                    var j = 0;
                    crit.criteria.forEach((c) => {
                        var y2 = c.y;
                        if (crit.userWeight < 0) y2 = y2.map((v) => 1 - v);
                        csComp.Helpers.Plot.drawMcaPlot(c.propValues, {
                            id          : id + '_' + j++,
                            width       : 220,
                            height      : 70,
                            xy          : { x: c.x, y: y2 },
                            featureValue: this.selectedFeature ? this.selectedFeature.properties[c.label] : null
                        });
                    });
                }
            });
        }

        private getParentOfSelectedCriterion(criterion?: Models.Criterion) {
            var parent: Models.Criterion[];
            this.mca.update();
            if (typeof criterion === 'undefined' || this.mca.criteria.indexOf(criterion) >= 0) {
                this.selectedCriterion = null;
                parent = this.mca.criteria;
            } else {
                this.mca.criteria.forEach((c) => {
                    if (c.criteria.indexOf(criterion) >= 0) {
                        this.selectedCriterion = c;
                        parent = c.criteria;
                    }
                });
            }
            return parent;
        }

        private drawHistogram(criterion?: Models.Criterion) {
            if (!this.mca || !this.selectedFeature) return;

            var currentLevel = this.getParentOfSelectedCriterion(criterion);
            if (typeof currentLevel === 'undefined' || currentLevel == null) return;
            var data         : number[] = [];
            var options      : csComp.Helpers.IHistogramOptions = {
                id           : McaCtrl.mcaChartId,
                numberOfBins : 10,
                width        : 240,
                height       : 100,
                selectedValue: this.selectedFeature.properties[this.mca.label]
            };
            this.features.forEach((feature: Feature) => {
                if (feature.properties.hasOwnProperty(this.mca.label)) {
                    // The property is available. I use the '+' to convert the string value to a number.
                    var prop = feature.properties[this.mca.label];
                    if ($.isNumeric(prop)) data.push(prop);
                }
            });

            csComp.Helpers.Plot.drawHistogram(data, options);
        }

        private drawAsterPlot(criterion?: Models.Criterion) {
            if (!this.mca || !this.selectedFeature) return;
            var currentLevel = this.getParentOfSelectedCriterion(criterion);
            if (typeof currentLevel === 'undefined' || currentLevel == null) return;
            var data: csComp.Helpers.AsterPieData[] = [];
            var i = 0;
            currentLevel.forEach((c) => {
                var rawScore   = c.getScore(this.selectedFeature);
                var pieData    = new csComp.Helpers.AsterPieData();
                pieData.id     = i++;
                pieData.label  = c.getTitle();
                pieData.weight = Math.abs(c.weight);
                pieData.color  = c.color;
                pieData.score  = (c.weight > 0 ? rawScore : 1-rawScore) * 100;
                data.push(pieData);
            });
            csComp.Helpers.Plot.drawAsterPlot(100, data, McaCtrl.mcaChartId);
        }

        private drawPieChart(criterion?: Models.Criterion) {
            if (!this.mca) return;
            var currentLevel = this.getParentOfSelectedCriterion(criterion);
            if (typeof currentLevel === 'undefined' || currentLevel == null) return;
            var data: csComp.Helpers.PieData[] = [];
            var i = 0;
            currentLevel.forEach((c) => {
                var pieData    = new csComp.Helpers.PieData();
                pieData.id     = i++;
                pieData.label  = c.getTitle();
                pieData.weight = Math.abs(c.weight);
                pieData.color  = c.color;
                data.push(pieData);
            });
            csComp.Helpers.Plot.drawPie(100, data, McaCtrl.mcaChartId);
        }

        /**
        * Based on the currently loaded features, which MCA can we use
        */
        updateAvailableMcas(mca?: Models.Mca) {
            this.showChart = false;
            this.mca = mca;
            this.availableMcas = [];

            this.$layerService.project.mcas.forEach((m) => {
                m.featureIds.forEach((featureId: string) => {
                    if (this.availableMcas.indexOf(m) < 0 && this.$layerService.featureTypes.hasOwnProperty(featureId)) {
                        this.availableMcas.push(m);
                        var featureType = this.$layerService.featureTypes[featureId];
                        this.applyPropertyInfoToCriteria(m, featureType);
                    }
                });
            });
            if (mca == null && this.availableMcas.length > 0) {
                this.mca = this.availableMcas[0];
                this.updateMca();
            }
        }

        calculateMca() {
            if (!this.mca) return;
            var mca = this.mca;
            mca.featureIds.forEach((featureId: string) => {
                if (!(this.$layerService.featureTypes.hasOwnProperty(featureId))) return;
                this.addPropertyInfo(featureId, mca);
                this.$layerService.project.features.forEach((feature) => {
                    if (feature.featureTypeName != null && feature.featureTypeName === featureId)
                        this.features.push(feature);
                });
                if (this.features.length === 0) return;
                mca.updatePla(this.features);
                mca.update();
                var tempScores: { score: number; index: number; }[] = [];
                var index = 0;
                this.features.forEach((feature) => {
                    var score = mca.getScore(feature);
                    if (mca.rankTitle) {
                        var tempItem = { score: score, index: index++ };
                        tempScores.push(tempItem);
                    }
                    feature.properties[mca.label] = score * 100;
                    this.$layerService.calculateFeatureStyle(feature);
                    this.$layerService.activeMapRenderer.updateFeature(feature);
                    //this.$layerService.updateFeature(feature);
                });
                if (mca.rankTitle) {
                    // Add rank information
                    tempScores.sort((a, b) => { return b.score - a.score; });
                    var length = this.features.length;
                    var scaleRange = mca.scaleMinValue ? Math.abs(mca.scaleMaxValue - mca.scaleMinValue) + 1 : length;
                    var scaleFactor = Math.ceil(length / scaleRange);
                    var rankFunction = mca.scaleMinValue
                        ? mca.scaleMaxValue > mca.scaleMinValue
                            ? (position: number) => { return mca.scaleMaxValue - Math.round(position / scaleFactor); }
                            : (position: number) => { return mca.scaleMinValue + Math.round(position / scaleFactor); }
                        : (position: number) => { return position};
                    var prevScore = -1;
                    var rank: number = 1;
                    for (var i = 0; i < length; i++) {
                        var item = tempScores[i];
                        // Assign items with the same value the same rank.
                        if (item.score !== prevScore)
                            rank = i + 1;
                        prevScore = item.score;
                        this.features[item.index].properties[mca.label + '#'] = rankFunction(rank) + ',' + scaleRange;
                    }
                }
            });
            this.updateSelectedFeature(this.selectedFeature, false);
            if (this.selectedFeature) {
                this.messageBusService.publish('feature', 'onFeatureSelect', this.selectedFeature);
            }
            if (this.groupStyle) this.$layerService.updateStyle(this.groupStyle);
        }

        private applyPropertyInfoToCriteria(mca: Models.Mca, featureType: IFeatureType) {
            var propertyTypes = csComp.Helpers.getPropertyTypes(featureType, this.$layerService.propertyTypeData);
            if (propertyTypes.length === 0) return;
            mca.criteria.forEach((criterion) => {
                var label = criterion.label;
                propertyTypes.forEach((propInfo) => {
                    if (propInfo.label === label) {
                        criterion.title = propInfo.title;
                        criterion.description = propInfo.description;
                    }
                });
            });
        }

        private addPropertyInfo(featureId: string, mca: Models.Mca, forceUpdate = false) {
            var featureType = this.$layerService.featureTypes[featureId];
            //var propertyTypes = featureType.propertyTypeData;
            var propertyTypes = csComp.Helpers.getPropertyTypes(featureType, this.$layerService.propertyTypeData);
            var labelIndex = -1;
            for (var i = propertyTypes.length-1; i >= 0; i--) {
                if (propertyTypes[i].label === mca.label) {
                    labelIndex = i;
                    break;
                }
            }
            if (forceUpdate || labelIndex < 0) {
                var pt = McaCtrl.createPropertyType(mca);
                if (labelIndex < 0)
                {
                    if (featureType.propertyTypeData === null) featureType.propertyTypeData = [];
                    featureType.propertyTypeData.push(pt); // NOTE: propertyTypes refers to a new list, so you cannot add to it.
                } else
                    propertyTypes[labelIndex] = pt;        // NOTE: but you should be able to overwrite an existing property.
            }

            if (!mca.rankTitle) return;
            labelIndex = -1;
            for (i = propertyTypes.length - 1; i >= 0; i--) {
                if (propertyTypes[i].label === mca.rankLabel) {
                    labelIndex = i;
                    break;
                }
            }
            if (forceUpdate || labelIndex < 0) {
                pt = McaCtrl.createRankPropertyType(mca);
                if (labelIndex < 0)
                    featureType.propertyTypeData.push(pt);
                else
                    propertyTypes[labelIndex] = pt;
            }
        }

        setStyle(item: FeatureProps.CallOutProperty) {
            // If groupStyle has been set, we have called it before.
            // However, make sure that not another filter has set the fillColor too, overwriting our label.
            if (this.groupStyle
                && this.groupStyle.group != null
                && this.groupStyle.group.styles != null
                && this.groupStyle.group.styles.filter((s) => { return s.visualAspect === 'fillColor'; })[0].property === this.mca.label)
                this.$layerService.updateStyle(this.groupStyle);
            else {
                this.groupStyle = this.$layerService.setStyle(item, false);
                this.groupStyle.colors = ['#F04030', '#3040F0'];
                this.$layerService.updateStyle(this.groupStyle);
            }
        }

        private static createPropertyType(mca: Models.Mca): IPropertyType {
            var mi : IPropertyType = {
                title            : mca.title,
                label            : mca.label,
                type             : 'number',
                maxValue         : 1,
                minValue         : 0,
                description      : mca.description,
                stringFormat     : mca.stringFormat,
                visibleInCallOut : true,
                section          : mca.section || 'MCA'
            };
            return mi;
        }

        private static createRankPropertyType(mca: Models.Mca): IPropertyType {
            var mi : IPropertyType = {
                title            : mca.rankTitle,
                label            : mca.rankLabel,
                type             : 'rank',
                description      : mca.rankDescription,
                stringFormat     : mca.rankFormat,
                visibleInCallOut : true,
                section          : mca.section || 'MCA'
            };
            return mi;
        }
    }
}
