import { Meteor } from 'meteor/meteor';
import _ from 'underscore';

import {Users} from '/imports/api/users';
import {Apps} from '/imports/api/apps';
import {Dashboards} from '/imports/api/dashboards';
import {Visualizations} from '/imports/api/visualizations';
import {DataPanels} from '/imports/api/datapanels';
import {DataSets} from '/imports/api/datasets';
import {Playground} from '/imports/api/playground';

import {aceJsonSchemaOptions, aceJavaScriptOptions, aceHTMLOptions} from '/imports/ui/partials/aceoptions';

export const nvd3VizDesignCtrl = ['$scope', '$reactive', '$timeout', '$state', 'reactiveDataFactory', 'readState',
'reactivePipeline',
function ($scope, $reactive, $timeout, $state, reactiveDataFactory, readState, reactivePipelineService) {
  $reactive(this).attach($scope);
  let self = this;

  this.readState = readState;

  this.helpers({
    template: () => Playground.findOne({_id: $scope.vizDesignCtrl.visualization.templateId}),
    basicOptionsSchema: () => {
      self.basicOptionsSchemaObject = Playground.findOne({_id: self.template.basicOptionsSchemaId});
      return eval("(" + self.basicOptionsSchemaObject.jsonSchema + ")");
    }
  });

  this.validators = {
    basicOptions: true,
    advancedOptions: true
  };

  this.validItem = () => (self.validators.basicOptions && self.validators.advancedOptions);

  this.itemStream = new Rx.ReplaySubject(0);
  $scope.$watch('vizDesignCtrl.visualization', _.debounce(function(item) {
    $scope.$apply(function() {
      if (self.dataForm) self.validators.basicOptions = self.dataForm.$valid;
      if (self.advancedOptionsForm) self.validators.advancedOptions = self.advancedOptionsForm.$valid;
      self.itemStream.onNext({
        valid: self.validItem(),
        item: item
      });
    });
  }, 2), true); // the 2 milli second debounce is for validators and reactive computes to kick in.

  //update database
  self.itemStream
  .skip(1)
  .filter(x => x.valid)
  .map(x => x.item)
  .doOnNext(x => {
    $scope.vizDesignCtrl.updateDatabase(x);
  }).subscribe(new Rx.ReplaySubject(0));

  let reactivePipeline = reactivePipelineService.getInstance();
  let tds = reactivePipeline.addReactiveData(readState.pipeline.findReactiveData($scope.vizDesignCtrl.visualization.dataSetId));

  this.inputSchemaObject = Playground.findOne({_id: self.template.inputSchemaId});
  let validatedDataSet = {
    _id: "validatedData",
    name: "Validated Data",
    dataSetType: "validated",
    jsonSchema: self.inputSchemaObject.jsonSchema,
    parentId: $scope.vizDesignCtrl.visualization.dataSetId
  };
  let vds = reactivePipeline.addDataSet(validatedDataSet);

  let basicOptionsDataSet = {
    _id: "basicOptions",
    name: "Basic Options",
    dataSetType: "raw",
    rawData: $scope.vizDesignCtrl.visualization.basicOptions
  }
  let bods = reactivePipeline.addDataSet(basicOptionsDataSet);

  let validatedBasicOptionsDataSet = {
    _id: "validatedBasicOptions",
    name: "Validated Basic Options",
    dataSetType: "validated",
    jsonSchema: self.basicOptionsSchemaObject.jsonSchema,
    parentId: "basicOptions"
  };
  let vbods = reactivePipeline.addDataSet(validatedBasicOptionsDataSet);

  let canonicalDataSet = {
    _id: 'canonicalData',
    name: "Canonical Data",
    dataSetType: "transformed",
    stateParams: {
      enabled: false
    },
    parents: ['validatedData', 'validatedBasicOptions'],
    transformFunction: self.template.canonicalTransform
  };
  let cds = reactivePipeline.addDataSet(canonicalDataSet);

  this.canonicalSchemaObject = Playground.findOne({_id: self.template.canonicalSchemaId});
  let validatedCanonicalDataSet = {
    _id: "validatedCanonicalData",
    name: "Validated Canonical Data",
    dataSetType: "validated",
    jsonSchema: self.canonicalSchemaObject.jsonSchema,
    parentId: "canonicalData"
  };
  let vcds = reactivePipeline.addDataSet(validatedCanonicalDataSet);
  vcds.stream.doOnNext(x => (self.canonicalDataObject = x)).subscribe(new Rx.ReplaySubject(0));

  //update basicOptions
  self.itemStream
  .filter(x => self.validators.basicOptions)
  .map(x => x.item.basicOptions)
  .distinctUntilChanged()
  .doOnNext(x => {
    basicOptionsDataSet.rawData = x;
    bods = reactivePipeline.changeDataSet(basicOptionsDataSet);
  }).subscribe(new Rx.ReplaySubject(0));

  //update advancedOptions
  self.itemStream
  .filter(x => self.validators.advancedOptions)
  .map(x => x.item.advancedOptions)
  .distinctUntilChanged() // should this be object compare for performance?
  .doOnNext(x => {
    self.advancedOptions = eval("(" + x + ")");
  }).subscribe(new Rx.ReplaySubject(0));

}];
