import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.scss';
import Link from '@docusaurus/Link';
import { JSX } from 'react';

type FeatureItem = {
    title: string;
    Svg: string;
    link: string;
    description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
    // {
    //     title: 'Easy to Use',
    //     Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    //     description: (
    //         <>
    //             Docusaurus was designed from the ground up to be easily installed and used to get
    //             your website up and running quickly.
    //         </>
    //     )
    // },
    {
        title: '技术笔记与知识沉淀',
        Svg: require('@site/static/img/tree.png').default,
        link: '/docs/introduce',
        description: (
            <>
                内容覆盖：计算机网络、前后端开发、编程语言、工程化实践与软件测试
            </>
        )
    },
    {
        title: '个人随记',
        Svg: require('@site/static/img/cabin.png').default,
        link: '/blog',
        description: <>记录技术探索历程、项目实践、学习心得与个人思考。</>
    }
];

function Feature({ title, Svg, description, link }: FeatureItem) {
    return (
        <div className={clsx('col col--6')}>
            <Link to={link as string}>
                <div className="text--center">
                    {/* <Svg className={styles.featureSvg} role="img" /> */}
                    <img src={Svg} alt="" />
                </div>
                <div className="text--center padding-horiz--md">
                    <Heading as="h3">{title}</Heading>
                    <p>{description}</p>
                </div>
            </Link>
        </div>
    );
}

export default function HomepageFeatures(): JSX.Element {
    return (
        <section className={styles.features}>
            <div className="container">
                <div className="row">
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    );
}
