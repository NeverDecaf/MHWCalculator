'use strict';
/**
 * Candidate Bundles
 *
 * @package     MHW Calculator
 * @author      Scar Wu
 * @copyright   Copyright (c) Scar Wu (http://scar.tw)
 * @link        https://github.com/scarwu/MHWCalculator
 */

// Load Libraries
import React, { Component } from 'react';

// Load Core Libraries
import Event from 'core/event';
import Helper from 'core/helper';

// Load Custom Libraries
import _ from 'libraries/lang';
import DataSet from 'libraries/dataset';
import FittingAlgorithm from 'libraries/fittingAlgorithm';

// Load Components
import FunctionalIcon from 'components/common/functionalIcon';

// Load Constant
import Constant from 'constant';

export default class CandidateBundles extends Component {

    // Default Props
    static defaultProps = {
        data: {},
        onPickUp: (data) => {}
    };

    // Initial State
    state = {
        bundleList: [],
        bundleLimit: 25,
        searchTime: null,
        isSearching: false
    };

    /**
     * Handle Functions
     */
    handleBundlePickUp = (index) => {
        let bundleList = this.state.bundleList;

        this.props.onPickUp(bundleList[index]);
    };

    handleLimitChange = () => {
        let bundleLimit = parseInt(this.refs.bundleLimit.value, 10);
        bundleLimit = !isNaN(bundleLimit) ? bundleLimit : 0;

        this.setState({
            bundleLimit: bundleLimit
        });
    };

    /**
     * Lifecycle Functions
     */
    componentDidMount () {
        Event.on('SearchCandidateEquips', 'CandidateBundles', (data) => {
            this.setState({
                isSearching: true
            });

            setTimeout(() => {
                let startTime = new Date().getTime();
                let bundleList = FittingAlgorithm.search(data.equips, data.ignoreEquips, data.sets, data.skills);
                let stopTime = new Date().getTime();

                let searchTime = (stopTime - startTime) / 1000;

                Helper.log('Bundle List:', bundleList);
                Helper.log('Search Time:', searchTime);

                this.setState({
                    bundleList: bundleList,
                    searchTime: searchTime,
                    isSearching: false
                });
            }, 100);
        });
    }

    /**
     * Render Functions
     */
    renderBundleItems = () => {
        let bundleList = this.state.bundleList;
        let bundleLimit = this.state.bundleLimit;

        return bundleList.slice(0, bundleLimit).map((data, index) => {
            return (
                <div key={index} className="row mhwc-bundle">
                    <div className="col-12 mhwc-name">
                        <span className="mhwc-bundle_name">{_('bundle')}: {index + 1}</span>

                        <div className="mhwc-icons_bundle">
                            <FunctionalIcon
                                iconName="check" altName={_('equip')}
                                onClick={() => {this.handleBundlePickUp(index)}} />
                        </div>
                    </div>

                    <div className="col-12 mhwc-item mhwc-equips">
                        <div className="col-12 mhwc-name">
                            <span>{_('equip')}</span>
                        </div>
                        <div className="col-12 mhwc-value">
                            <div className="row">
                            {Object.keys(data.equips).map((euqipType) => {
                                return (null !== data.equips[euqipType]) ? [(
                                    <div key={'weapon_1'} className="col-2">
                                        <div className="mhwc-name">
                                            <span>{_(euqipType)}</span>
                                        </div>
                                    </div>
                                ), (
                                    <div key={'weapon_2'} className="col-4">
                                        <div className="mhwc-value">
                                            <span>{_(DataSet.armorHelper.getInfo(data.equips[euqipType]).name)}</span>
                                        </div>
                                    </div>
                                )] : false;
                            })}
                            </div>
                        </div>
                    </div>

                    <div className="col-12 mhwc-item mhwc-defense">
                        <div className="row">
                            <div className="col-4 mhwc-name">
                                <span>{_('defense')}</span>
                            </div>
                            <div className="col-8 mhwc-value">
                                <span>{data.defense}</span>
                            </div>
                        </div>
                    </div>

                    {(0 < data.meta.remainingSlotCount.all) ? (
                        <div className="col-12 mhwc-item mhwc-slots">
                            <div className="col-12 mhwc-name">
                                <span>{_('remainingSlot')}</span>
                            </div>
                            <div className="col-12 mhwc-value">
                                <div className="row">
                                    {Object.keys(data.meta.remainingSlotCount).map((slotSize) => {
                                        if ('all' === slotSize) {
                                            return;
                                        }

                                        let slotCount = data.meta.remainingSlotCount[slotSize];

                                        return (slotCount > 0) ? (
                                            <div key={slotSize} className="col-4">
                                                <div className="mhwc-value">
                                                    <span>{`[${slotSize}] x ${slotCount}`}</span>
                                                </div>
                                            </div>
                                        ) : false;
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : false}

                    {(0 !== Object.keys(data.jewels).length) ? (
                        <div className="col-12 mhwc-item mhwc-jewels">
                            <div className="col-12 mhwc-name">
                                <span>{_('jewel')}</span>
                            </div>
                            <div className="col-12 mhwc-value">
                                <div className="row">
                                    {Object.keys(data.jewels).sort((a, b) => {
                                        return data.jewels[b] - data.jewels[a];
                                    }).map((jewelId) => {
                                        let jewelCount = data.jewels[jewelId];
                                        let jewelName = DataSet.jewelHelper.getInfo(jewelId).name;
                                        let jewelSize = DataSet.jewelHelper.getInfo(jewelId).size;

                                        return (
                                            <div key={jewelId} className="col-4">
                                                <div className="mhwc-value">
                                                    <span>{`[${jewelSize}] ${_(jewelName)} x ${jewelCount}`}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : false}

                    {(0 !== Object.keys(data.skills).length) ? (
                        <div className="col-12 mhwc-item mhwc-skills">
                            <div className="col-12 mhwc-name">
                                <span>{_('skill')}</span>
                            </div>
                            <div className="col-12 mhwc-value">
                                <div className="row">
                                    {Object.keys(data.skills).sort((a, b) => {
                                        return data.skills[b] - data.skills[a];
                                    }).map((skillId) => {
                                        let skillCount = data.skills[skillId];
                                        let skillName = DataSet.skillHelper.getInfo(skillId).name;;

                                        return (
                                            <div key={skillId} className="col-6">
                                                <div className="mhwc-value">
                                                    <span>{`${_(skillName)} Lv.${skillCount}`}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : false}
                </div>
            );
        });
    };

    render () {
        return [(
            <div key={'bar'} className="row mhwc-panel">
                {true === this.state.isSearching ? (
                    <div className="mhwc-mask">
                        <i className="fa fa-spin fa-cog"></i>
                    </div>
                ) : false}

                {(null !== this.state.searchTime) ? (
                    <div className="row mhwc-search_info">
                        <div className="col-12">
                            <span>
                                搜尋花費 {this.state.searchTime} 秒，並列出 <input type="text" defaultValue={this.state.bundleLimit} ref="bundleLimit" onChange={this.handleLimitChange} /> / {this.state.bundleList.length} 筆結果。
                            </span>
                        </div>
                    </div>
                ) : false}
            </div>
        ), (
            <div key="list" className="mhwc-list">
                {this.renderBundleItems()}
            </div>
        )];
    }
}
