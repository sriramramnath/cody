import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import styles from './header.css';
import Box from '../box/box.jsx';

import memBer from './image/member1.svg';

class Header extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            timeLeft: 600 // 初始时间为1小时（3600秒）
        };
        this.timer = null;
    }

    componentDidMount() {
        this.timer = setInterval(() => {
            this.setState(prevState => ({
                timeLeft: prevState.timeLeft > 0 ? prevState.timeLeft - 1 : 0
            }));
        }, 1000);
    }

    componentWillUnmount() {
        clearInterval(this.timer);
    }

    formatTime(seconds) {
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    render() {
        const { timeLeft } = this.state;
        const { logo, title } = this.props;

        return (
            <Box className={classNames(styles.menuBar)}>
                <div className={styles.mainMenu}>
                    <div className={styles.menuBarItem}>
                        <img
                            id="logo_img"
                            alt="Scratch"
                            className={classNames(styles.scratchLogo)}
                            src={logo}
                        />
                    </div>
                    <div>{title}</div>
                </div>
                <div className={styles.menuBarItemTime}>
                    {timeLeft > 0 ? (
                        <>
                            <div>您已获得会员体验权限，您的体验时间剩余：</div>
                            <div className={styles.memberTimeinfo}>{this.formatTime(timeLeft)}</div>
                        </>
                    ) : (
                        <>
                            <div>您的会员体验时间已用尽，成为会员 </div>
                            <div className={styles.memberTimeButton}>立即解锁所有功能</div>
                        </>
                    )}
                </div>
                <div className={styles.menuBarItem}>
                    <button className={styles.menuBarItemButton}>
                        <img src={memBer} alt="member" className={styles.memberIcon} />开通会员
                    </button>
                </div>
            </Box>
        );
    }
}

Header.propTypes = {
    title: PropTypes.string.isRequired,
    logo: PropTypes.string.isRequired,
};

export default Header;