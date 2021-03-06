'use strict'

var React = require('react');

var {
  ListView,
  Platform,
  TouchableHighlight,
  View,
  Text,
  RefreshControl,
  ActivityIndicator
} = require('react-native');


// small helper function which merged two objects into one
function MergeRecursive(obj1, obj2) {
  for (var p in obj2) {
    try {
      if ( obj2[p].constructor==Object ) {
        obj1[p] = MergeRecursive(obj1[p], obj2[p]);
      } else {
        obj1[p] = obj2[p];
      }
    } catch(e) {
      obj1[p] = obj2[p];
    }
  }
  return obj1;
}

var GiftedListView = React.createClass({

  getDefaultProps() {
    return {
      customStyles: {},
      initialListSize: 10,
      firstLoader: true,
      pagination: true,
      refreshable: true,
      refreshableColors: undefined,
      refreshableProgressBackgroundColor: undefined,
      refreshableSize: undefined,
      refreshableTitle: undefined,
      refreshableTintColor: undefined,
      renderRefreshControl: null,
      headerView: null,
      sectionHeaderView: null,
      scrollEnabled: true,
      withSections: false,
      autoPaginate: false,
      onFetch(page, options) { return Promise.resolve([]) },

      paginationFetchingView: null,
      paginationAllLoadedView: null,
      paginationWaitingView: null,
      emptyView: null,
      renderSeparator: null,
      rowHasChanged:null,
      distinctRows:null,
    };
  },

  propTypes: {
    customStyles: React.PropTypes.object,
    initialListSize: React.PropTypes.number,
    firstLoader: React.PropTypes.bool,
    pagination: React.PropTypes.bool,
    refreshable: React.PropTypes.bool,
    refreshableColors: React.PropTypes.array,
    refreshableProgressBackgroundColor: React.PropTypes.string,
    refreshableSize: React.PropTypes.string,
    refreshableTitle: React.PropTypes.string,
    refreshableTintColor: React.PropTypes.string,
    renderRefreshControl: React.PropTypes.func,
    headerView: React.PropTypes.func,
    sectionHeaderView: React.PropTypes.func,
    scrollEnabled: React.PropTypes.bool,
    withSections: React.PropTypes.bool,
    autoPaginate: React.PropTypes.bool,
    onFetch: React.PropTypes.func,
    onPostFetch: React.PropTypes.func,

    paginationFetchingView: React.PropTypes.func,
    paginationAllLoadedView: React.PropTypes.func,
    paginationWaitingView: React.PropTypes.func,
    emptyView: React.PropTypes.func,
    renderSeparator: React.PropTypes.func,

    dataSource: React.PropTypes.object,
    onRefresh: React.PropTypes.func,

    rowHasChanged:React.PropTypes.func,
    distinctRows:React.PropTypes.func,
  },

  _setPage(page) {
    this._page = page;
  },
  _getPage() {
    return this._page;
  },
  _setRows(rows) {
    this._rows = rows;
  },
  _getRows() {
    return this._rows;
  },
  _getRowsLength() {
    if (this.props.dataSource) {
      return this.props.dataSource.getRowCount()
    } else {
      return this._getRows().length
    }
  },

  paginationFetchingView() {
    if (this.props.paginationFetchingView) {
      return this.props.paginationFetchingView();
    }

    return (
      <View style={[this.defaultStyles.paginationView, this.props.customStyles.paginationView]}>
        <ActivityIndicator animating={true} size="small" />
      </View>
    );
  },
  paginationAllLoadedView() {
    if (this.props.paginationAllLoadedView) {
      return this.props.paginationAllLoadedView(this._getRowsLength());
    }

    return (
      <View style={[this.defaultStyles.paginationView, this.props.customStyles.paginationView]}>
        <Text style={[this.defaultStyles.actionsLabel, this.props.customStyles.actionsLabel]}>
          ~
        </Text>
      </View>
    );
  },
  paginationWaitingView(paginateCallback) {
    if (this.props.paginationWaitingView) {
      return this.props.paginationWaitingView(paginateCallback);
    }

    return (
      <TouchableHighlight
        underlayColor='#c8c7cc'
        onPress={paginateCallback}
        style={[this.defaultStyles.paginationView, this.props.customStyles.paginationView]}
      >
        <Text style={[this.defaultStyles.actionsLabel, this.props.customStyles.actionsLabel]}>
          Load more
        </Text>
      </TouchableHighlight>
    );
  },
  headerView() {
    if (this.state.paginationStatus === 'firstLoad' || !this.props.headerView){
      return null;
    }
    return this.props.headerView();
  },
  emptyView(refreshCallback) {
    if (this.props.emptyView) {
      return this.props.emptyView(refreshCallback);
    }

    return (
      <View style={[this.defaultStyles.defaultView, this.props.customStyles.defaultView]}>
        <Text style={[this.defaultStyles.defaultViewTitle, this.props.customStyles.defaultViewTitle]}>
          Sorry, there is no content to display
        </Text>

        <TouchableHighlight
          underlayColor='#c8c7cc'
          onPress={refreshCallback}
        >
          <Text>
            ↻
          </Text>
        </TouchableHighlight>
      </View>
    );
  },
  renderSeparator() {
    if (this.props.renderSeparator) {
      return this.props.renderSeparator();
    }

    return (
      <View style={[this.defaultStyles.separator, this.props.customStyles.separator]} />
    );
  },

  getInitialState() {
    var ds = null;
    const initialState = {
      isRefreshing: false,
      paginationStatus: 'firstLoad',
    }

    if (this.props.dataSource) {
      return initialState
    }

    if (this.props.withSections === true) {
      ds = new ListView.DataSource({
        rowHasChanged: this.props.rowHasChanged?this.props.rowHasChanged:(row1, row2) => row1 !== row2,
        sectionHeaderHasChanged: (section1, section2) => section1 !== section2,
      });
      return {
        dataSource: ds.cloneWithRowsAndSections([]),
        ...initialState
      };
    } else {
      ds = new ListView.DataSource({
        rowHasChanged: this.props.rowHasChanged?this.props.rowHasChanged:(row1, row2) => row1 !== row2,
      });
      return {
        dataSource: ds.cloneWithRows([]),
        ...initialState
      };
    }
  },

  componentWillMount() {
    this._setPage(1);
    this._setRows([]);
  },

  componentDidMount() {
    this.props.onFetch(this._getPage(), {firstLoad: true, isRefreshing: false}).then(res => {
      if (this.props.dataSource) {
        this._postRefresh([], res ? res.options : {})
      } else if (!Array.isArray(res)) {
        this._postRefresh(res.rows, res.options)
      } else {
        this._postRefresh(res, {})
      }
    })
  },

  setNativeProps(props) {
    this.refs.listview.setNativeProps(props);
  },

  _refresh() {
    this._onRefresh({external: true});
  },

  _onRefresh(options = {}) {
    if (this.isMounted()) {
      this.setState({
        isRefreshing: true,
      });
      this._setPage(1);
      this.props.onFetch(1, { ...options, isRefreshing: true }).then(res => {
        if (this.props.dataSource) {
          this._postRefresh([], res ? res.options : {})
        } else if (!Array.isArray(res)) {
          this._postRefresh(res.rows, res.options)
        } else {
          this._postRefresh(res, {})
        }
      });
    }
  },

  _postRefresh(rows = [], options = {}) {
    if (this.isMounted()) {
      this._updateRows(rows, options);
      if (this.props.onPostFetch) {
        this.props.onPostFetch()
      }
    }
  },

  onEndReached() {
    if(!this.state.firstLoadComplete) return;

    if (this.props.autoPaginate) {
      this._onPaginate();
    }
    if (this.props.onEndReached) {
      this.props.onEndReached();
    }
  },

  _onPaginate() {
    if (this.state.paginationStatus === 'firstLoad' || this.state.paginationStatus === 'waiting') {
      this.setState({paginationStatus: 'fetching'});
      this.props.onFetch(this._getPage() + 1, { isRefreshing: false }).then(res => {
        if (this.props.dataSource) {
          this._postPaginate([], res ? res.options : {})
        } else if (!Array.isArray(res)) {
          this._postPaginate(res.rows, res.options)
        } else {
          this._postPaginate(res, {})
        }
      });
    }
  },

  _postPaginate(rows = [], options = {}) {
    this._setPage(this._getPage() + 1);

    var mergedRows = null;

    if (this.props.withSections === true) {
      mergedRows = MergeRecursive(this._getRows(), rows);
    } else {
      mergedRows = this._getRows().concat(rows);
    }

    if(this.props.distinctRows){
      mergedRows = this.props.distinctRows(mergedRows);
    }

    this._updateRows(mergedRows, options);
    if (this.props.onPostFetch) {
      this.props.onPostFetch()
    }
  },


  _updateRows(rows = [], options = {}) {
    let state = {
      isRefreshing: false,
      paginationStatus: (options.allLoaded === true ? 'allLoaded' : 'waiting'),
    };

    if (rows !== null) {
      this._setRows(rows);

      if (!this.props.dataSource) {
        if (this.props.withSections === true) {
          state.dataSource = this.state.dataSource.cloneWithRowsAndSections(rows);
        } else {
          state.dataSource = this.state.dataSource.cloneWithRows(rows);
        }
      }
    }

    this.setState(state);

    //this must be fired separately or iOS will call onEndReached 2-3 additional times as
    //the ListView is filled. So instead we rely on React's rendering to cue this task
    //until after the previous state is filled and the ListView rendered. After that,
    //onEndReached callbacks will fire. See onEndReached() above.
    if(!this.state.firstLoadComplete) this.setState({firstLoadComplete: true});
  },

  _renderPaginationView() {
    let paginationEnabled = this.props.pagination === true || this.props.autoPaginate === true;

    if ((this.state.paginationStatus === 'fetching' && paginationEnabled) || (this.state.paginationStatus === 'firstLoad' && this.props.firstLoader === true)) {
      return this.paginationFetchingView();
    } else if (this.state.paginationStatus === 'waiting' && this.props.pagination === true && (this.props.withSections === true || this._getRowsLength() > 0)) { //never show waiting for autoPaginate
      return this.paginationWaitingView(this._onPaginate);
    } else if (this.state.paginationStatus === 'allLoaded' && paginationEnabled && this._getRowsLength() > 0) {
      return this.paginationAllLoadedView();
    } else if (this._getRowsLength() === 0) {
      return this.emptyView(this._onRefresh);
    } else {
      return null;
    }
  },

  renderRefreshControl() {
    if (this.props.renderRefreshControl) {
      return this.props.renderRefreshControl({ onRefresh: this._onRefresh });
    }
    return (
      <RefreshControl
        onRefresh={this._onRefresh}
        refreshing={this.state.isRefreshing}
        colors={this.props.refreshableColors}
        progressBackgroundColor={this.props.refreshableProgressBackgroundColor}
        size={this.props.refreshableSize}
        tintColor={this.props.refreshableTintColor}
        title={this.props.refreshableTitle}
      />
    );
  },

  render() {
    return (
      <ListView
        ref="listview"
        dataSource={this.state.dataSource}
        renderRow={this.props.rowView}
        renderSectionHeader={this.props.sectionHeaderView}
        renderHeader={this.headerView}
        renderFooter={this._renderPaginationView}
        renderSeparator={this.renderSeparator}
        onEndReached={this.onEndReached}
        automaticallyAdjustContentInsets={false}
        scrollEnabled={this.props.scrollEnabled}
        canCancelContentTouches={true}
        refreshControl={this.props.refreshable === true ? this.renderRefreshControl() : null}

        {...this.props}

        style={this.props.style}
      />
    );
  },

  scrollTo(options) {
    this.refs.listview.scrollTo(options)
  },

  scrollToEnd(options) {
    this.refs.listview.scrollToEnd(options)
  },

  defaultStyles: {
    separator: {
      height: 1,
      backgroundColor: '#CCC'
    },
    actionsLabel: {
      fontSize: 20,
    },
    paginationView: {
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFF',
    },
    defaultView: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    defaultViewTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 15,
    },
  },
});


module.exports = GiftedListView;
