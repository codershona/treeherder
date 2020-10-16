import React from 'react';
import { Container } from 'reactstrap';

import { getData } from '../helpers/http';
import { getProjectUrl, getUrlParam } from '../helpers/location';
import { createQueryParams, pushEndpoint } from '../helpers/url';
import PushModel from '../models/push';
import RepositoryModel from '../models/repository';

import CommitHistory from './CommitHistory';

const defaultRepo = 'try';

class MyPushes extends React.Component {
  constructor(props) {
    super(props);

    this.state = { pushMetrics: [], repos: [], pushes: [] };
  }

  async componentDidMount() {
    await this.fetchRepos();
    // if (this.props.user.isLoggedIn) {
    this.fetchPushes();
    // }
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.user.isLoggedIn && this.props.user.isLoggedIn) {
      this.fetchPushes();
    }
  }

  async fetchPushes() {
    // TODO change to author to this.props.user.email
    const options = { repo: 'try', author: 'reviewbot', count: 3 };
    const { data, failureStatus } = await PushModel.getList(options);

    if (!failureStatus && data.results) {
      this.setState({ pushes: data.results });

      const revisions = data.results.map((push) => `${push.revision},`);
      console.log(revisions);
      await this.fetchMetrics(revisions);
    }
  }

  async fetchRepos() {
    const repos = await RepositoryModel.getList();
    this.setState({ repos });
  }

  async fetchMetrics(revisions) {
    const options = {
      revision: revisions,
    };

    const { data, failureStatus } = await getData(
      getProjectUrl(
        `${pushEndpoint}health_summary/${createQueryParams(options)}`,
        defaultRepo,
      ),
    );

    if (!failureStatus && data.length) {
      this.setState({ pushMetrics: data });
    }
    // TODO notify with failure message
  }

  formatRevisionHistory = (push) => ({
    // parentRepository,
    // jobCounts,
    // exactMatch,
    // parentPushRevision,
    parentSha: push.revision,
    id: push.id,
    revisions: push.revisions,
    revisionCount: push.revisions.length,
    currentPush: { author: push.author, push_timestamp: push.push_timestamp },
  });

  render() {
    const { user } = this.props;
    const { pushes, repos, pushMetrics } = this.state;
    // const currentRepo = repos.find((repoObj) => repoObj.name === defaultRepo);
    console.log(pushMetrics);
    return (
      <Container fluid className="mt-2 mb-5 max-width-default">
        {/* {!user.isLoggedIn && (
          <h2 className="pt-5 text-center">
            Please log in to see your Try pushes
          </h2>
        )} */}
        <div className="d-flex mb-5">
          {/* {pushMetrics.length &&
        <StatusProgress counts={pushMetrics} />} */}
          {repos.length > 0 &&
            pushes.length > 0 &&
            pushes.map((push) => (
              <div className="mt-4 ml-2" key={push.revision}>
                <CommitHistory
                  history={this.formatRevisionHistory(push)}
                  revision={push.revision}
                  currentRepo={repos.find(
                    (repo) => repo.id === push.repository_id,
                  )}
                  showParent={false}
                />
              </div>
            ))}
        </div>
      </Container>
    );
  }
}

export default MyPushes;
