import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import styles from '../css/pages/index.module.scss';
import { motion } from 'framer-motion';
import avatar from '@site/static/img/avatar.png';
function HomepageHeader() {
    const { siteConfig } = useDocusaurusContext();
    return (
        <header className={clsx('hero hero--primary', styles.heroBanner)}>
            <div className="container">
                <Heading as="h1" className="hero__title">
                    {/* {siteConfig.title} */}
                    <motion.img
                        drag
                        dragConstraints={{
                            top: -20,
                            left: -50,
                            right: 50,
                            bottom: 20
                        }}
                        whileHover={{ scale: 1.1 }}
                        className={styles.avatar}
                        src={avatar}
                        alt="AsMuin Logo"
                    />
                </Heading>
                <p className="hero__subtitle">{siteConfig.tagline}</p>
                <div className={styles.buttons}>
                    <Link
                        className="button button--secondary button--lg"
                        to="/introduction">
                        来自本站作者的一些话
                    </Link>
                </div>
            </div>
        </header>
    );
}

export default function Home() {
    // const { siteConfig } = useDocusaurusContext();
    return (
        <Layout
            title={`首页`}
            description="Description will go into a meta tag in <head />">
            <HomepageHeader />
            <main>
                <HomepageFeatures />
            </main>
        </Layout>
    );
}
