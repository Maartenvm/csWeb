﻿module csComp.Mca {
    import Plot = csComp.Helpers.Plot;

    export interface IMcaScope extends ng.IScope {
        vm: McaCtrl;
    }

    export class McaCtrl {
        public selectedFeature: csComp.GeoJson.IFeature;
        public selectedProperty: FeatureProps.CallOutProperty;

        public mca          : Models.Mca;
        public mcas         : Models.Mca[] = [];
        public availableMcas: Models.Mca[] = [];

        public static $inject = [
            '$scope',
            'layerService',
            'messageBusService'
        ];

        constructor(
            private $scope            : IMcaScope,
            private $layerService     : csComp.Services.LayerService,
            private messageBusService : csComp.Services.MessageBusService
            ) {
            $scope.vm = this;

            messageBusService.subscribe('layer', (title, layer: csComp.Services.ProjectLayer) => {
                this.availableMca();
            });

            messageBusService.subscribe("feature", this.featureMessageReceived);

            var mca = new Models.Mca();
            mca.title         = 'Zelfredzaamheid';
            mca.description   = 'Analyse van de zelfredzaamheid van een gemeente.';
            mca.label         = 'mca_zelfredzaamheid';
            mca.stringFormat  = '{0:0.0}';
            mca.rankTitle     = 'Rang';
            mca.rankFormat    = '{0} van {1}';
            mca.userWeightMax = 5;
            mca.featureIds    = ['cities_Default'];

            var criterion          = new Models.Criterion();
            criterion.label        = 'p_00_14_jr';
            criterion.color        = 'green';
            criterion.scores       = '[0,0 20,1]';
            criterion.userWeight   = 1;
            mca.criteria.push(criterion);

            criterion              = new Models.Criterion();
            criterion.label        = 'p_65_eo_jr';
            criterion.color        = 'red';
            criterion.scores       = '[0,0 25,1]';
            criterion.userWeight   = 3;
            mca.criteria.push(criterion);
            this.mcas.push(mca);

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
            criterion.color      = 'green';
            criterion.scores     = '[0,0 20,1]';
            criterion.userWeight = 1;
            mca.criteria.push(criterion);

            criterion            = new Models.Criterion();
            criterion.label      = 'p_65_eo_jr';
            criterion.color      = 'red';
            criterion.scores     = '[0,0 25,1]';
            criterion.userWeight = 3;
            mca.criteria.push(criterion);
            this.mcas.push(mca);

            $scope.$watch('vm.mca', (d) => {
                if (this.mca) this.drawPieChart();
                // console.log(JSON.stringify(d));
            }, true);
        }
        
        private featureMessageReceived = (title: string, feature: csComp.GeoJson.IFeature): void => {
            //console.log("MC: featureMessageReceived");
            switch (title) {
                case "onFeatureSelect":
                    this.updateSelectedFeature(feature);
                    break;
                case "onFeatureDeselect":
                    this.selectedFeature = null;
                    break;
                default:
                    console.log(title);
                    break;
            }
            if (this.$scope.$root.$$phase != '$apply' && this.$scope.$root.$$phase != '$digest') {
                this.$scope.$apply();
            }
        }

        private updateSelectedFeature(feature: csComp.GeoJson.Feature) {
            if (typeof feature === 'undefined' || feature == null) return;
            this.selectedFeature = feature;
            if (this.mca.label in feature.properties) {
                var mi = new csComp.GeoJson.MetaInfo();
                mi.label = this.mca.label;
                mi.title = this.mca.title;
                mi.type = 'number';
                mi.stringFormat = this.mca.stringFormat;
                mi.description = this.mca.description;
                var displayValue = FeatureProps.CallOut.convertPropertyInfo(mi, feature.properties[mi.label]);
                this.selectedProperty = new FeatureProps.CallOutProperty(mi.title, displayValue, mi.label, true, true, feature, false, mi.description);
                //console.log(feature);
                //this.displayFeature(feature);
            }
        }

        public drawPieChart(criterion?: Models.Criterion) {
            var currentLevel: Models.Criterion[];
            this.mca.update();
            if (typeof criterion === 'undefined' || this.mca.criteria.indexOf(criterion) >= 0) {
                currentLevel = this.mca.criteria;
            } else {
                this.mca.criteria.forEach((c) => {
                    if (c.criteria.indexOf(criterion) >= 0)
                        currentLevel = c.criteria;
                });
            }
            if (!currentLevel) return;
            var data: Plot.PieData[] = [];
            var i = 0;
            currentLevel.forEach((c) => {
                var pieData = new csComp.Helpers.PieData();
                pieData.id = i++;
                pieData.label = c.getTitle();
                pieData.weight = c.weight;
                data.push(pieData);
            });
            Plot.drawPie(100, data, 'Reds', 'mcaPieChart');
        }

        /** Based on the currently loaded features, which MCA can we use */
        public availableMca() {
            this.mca = null;
            this.availableMcas = [];
            this.mcas.forEach((m) => {
                m.featureIds.forEach((featureId: string) => {
                    if (this.availableMcas.indexOf(m) < 0 && featureId in this.$layerService.featureTypes) {
                        this.availableMcas.push(m);
                        var featureType = this.$layerService.featureTypes[featureId];
                        this.applyPropertyInfoToCriteria(m, featureType);
                    }
                });
            });
            if (this.availableMcas.length > 0) this.mca = this.availableMcas[0];
        }

        public calculateMca() {
            if (!this.mca) return;
            var mca = this.mca;
            mca.featureIds.forEach((featureId: string) => {
                if (!(featureId in this.$layerService.featureTypes)) return;
                this.addPropertyInfo(featureId, mca);
                var features: csComp.GeoJson.IFeature[] = [];
                this.$layerService.project.features.forEach((feature) => {
                    features.push(feature);
                });
                mca.updatePla(features);
                mca.update();
                this.$layerService.project.features.forEach((feature) => {
                    var score = mca.getScore(feature);
                    feature.properties[mca.label] = score * 100;
                });
            });
            this.updateSelectedFeature(this.selectedFeature);
        }

        private applyPropertyInfoToCriteria(mca: Models.Mca, featureType: csComp.GeoJson.IFeatureType) {
            mca.criteria.forEach((criterion) => {
                var label = criterion.label;
                featureType.metaInfoData.forEach((propInfo) => {
                    if (propInfo.label === label) {
                        criterion.title = propInfo.title;
                        criterion.description = propInfo.description;                      
                    }
                });
            });
        }

        public createMca() {
            
        }

        private addPropertyInfo(featureId: string, mca: Models.Mca) {
            var featureType = this.$layerService.featureTypes[featureId];
            if (featureType.metaInfoData.reduce(
                (prevValue, curItem) => { return prevValue || (curItem.label === mca.label); }, false)) return;
            var mi = new csComp.GeoJson.MetaInfo();
            mi.title = mca.title;
            mi.label = mca.label;
            mi.type = 'number';
            mi.maxValue = 1;
            mi.minValue = 0;
            mi.description = mca.description;
            mi.stringFormat = mca.stringFormat;
            mi.section = mca.section || 'Info';
            featureType.metaInfoData.push(mi);
        }
    }
} 