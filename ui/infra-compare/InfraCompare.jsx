import React from 'react';
import PropTypes from 'prop-types';

import withValidation from '../perfherder/Validation';

import { getCounterMap } from './helpers';
import { phTimeRanges } from './constants';
import InfraCompareTableView from './InfraCompareTableView';

class InfraCompareView extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      jobsNotDisplayed: [],
    };
  }

  getInterval = (oldTimestamp, newTimestamp) => {
    const now = new Date().getTime() / 1000;
    let timeRange = Math.min(oldTimestamp, newTimestamp);
    timeRange = Math.round(now - timeRange);
    const newTimeRange = phTimeRanges.find((time) => timeRange <= time.value);
    return newTimeRange.value;
  };

  getQueryParams = (timeRange) => {
    const {
      originalProject,
      newProject,
      originalRevision,
      newRevision,
      newResultSet,
      originalResultSet,
    } = this.props.validated;
    let originalParams;
    let interval;

    if (originalRevision) {
      interval = this.getInterval(
        originalResultSet.push_timestamp,
        newResultSet.push_timestamp,
      );
      originalParams = {
        project: originalProject,
        interval,
        revision: originalRevision,
      };
    } else {
      interval = timeRange.value;
      const startDateMs = (newResultSet.push_timestamp - interval) * 1000;
      const endDateMs = newResultSet.push_timestamp * 1000;

      originalParams = { originalProject, interval };
      originalParams.startday = new Date(startDateMs)
        .toISOString()
        .slice(0, -5);
      originalParams.endday = new Date(endDateMs).toISOString().slice(0, -5);
    }

    const newParams = { project: newProject, interval, revision: newRevision };
    return [originalParams, newParams];
  };

  getDisplayResults = (origResultsMap, newResultsMap, tableNames) => {
    let compareResults = new Map();
    tableNames.forEach((jobName) => {
      const originalResults = origResultsMap.filter(
        (job) => job.job_type__name.replace(/-\d+$/, '') === jobName,
      );
      const newResults = newResultsMap.filter(
        (job) => job.job_type__name.replace(/-\d+$/, '') === jobName,
      );
      const cmap = getCounterMap(jobName, originalResults, newResults);
      cmap.originalJobs = new Map();
      cmap.newJobs = new Map();
      originalResults.forEach((job) => {
        if (cmap.originalJobs.has(job.job_type__name))
          cmap.originalJobs.get(job.job_type__name).push(job.duration);
        else cmap.originalJobs.set(job.job_type__name, [job.duration]);
      });
      newResults.forEach((job) => {
        if (cmap.newJobs.has(job.job_type__name))
          cmap.newJobs.get(job.job_type__name).push(job.duration);
        else cmap.newJobs.set(job.job_type__name, [job.duration]);
      });
      if (!cmap.isEmpty) {
        if (compareResults.has(cmap.platform)) {
          compareResults.get(cmap.platform).push(cmap);
        } else {
          compareResults.set(cmap.platform, [cmap]);
        }
      } else {
        const { jobsNotDisplayed } = this.state;
        this.setState({
          jobsNotDisplayed: [...jobsNotDisplayed, jobName],
        });
      }
    });
    compareResults = new Map([...compareResults.entries()].sort());
    const updates = { compareResults, loading: false };
    this.props.updateAppState({ compareData: compareResults });

    return updates;
  };

  render() {
    return (
      <InfraCompareTableView
        {...this.props}
        jobsNotDisplayed={this.state.jobsNotDisplayed}
        getQueryParams={this.getQueryParams}
        getDisplayResults={this.getDisplayResults}
      />
    );
  }
}

InfraCompareView.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  validated: PropTypes.shape({
    originalResultSet: PropTypes.shape({}),
    newResultSet: PropTypes.shape({}),
    newRevision: PropTypes.string,
    originalProject: PropTypes.string,
    newProject: PropTypes.string,
    originalRevision: PropTypes.string,
  }),
};

InfraCompareView.defaultProps = {
  validated: PropTypes.shape({}),
};

const requiredParams = new Set([
  'originalProject',
  'newProject',
  'newRevision',
]);

export default withValidation({ requiredParams })(InfraCompareView);
