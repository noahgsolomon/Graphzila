import { useState, FormEvent } from 'react';
import "./App.css";
import cytoscape, { ElementsDefinition, Stylesheet } from 'cytoscape';
import {DARK_THEME_KEY, LIGHT_THEME_KEY, LOCALSTORAGE_THEME_KEY} from "./constants.ts";
import {toggleTheme} from "./toggleTheme.ts";

export default function App() {
    const [hover, setHover] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [userInput, setUserInput] = useState<string>('');
    const colors = ['#FF4500', '#8B0000', '#B22222', '#FFD700', '#FF8C00', '#2E8B57', '#6B8E23', '#483D8B', '#7FFF00', '#228B22'];
    const [theme, setTheme] = useState<
        typeof LIGHT_THEME_KEY | typeof DARK_THEME_KEY
    >(
        (localStorage.getItem(LOCALSTORAGE_THEME_KEY) as
            | typeof LIGHT_THEME_KEY
            | typeof DARK_THEME_KEY) || LIGHT_THEME_KEY
    );
    const randomColor = () => {
        return colors[Math.floor(Math.random() * colors.length)];
    };

    let cy: any;
    const postData = async (url: string, data: object): Promise<any> => {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        return await response.json();
    };

    // Function to parse the server response to a Cytoscape-compatible object
    const parseResponseToElements = (graphData: any) => {
        const { nodes, edges } = graphData.elements;
        const elements: ElementsDefinition = { nodes: [], edges: [] };

        nodes.forEach((node: any) => {
            elements.nodes.push({
                data: {
                    id: node.data.id,
                    label: node.data.label,
                    gradient: randomColor()
                },
            });
        });

        edges.forEach((edge: any) => {
            elements.edges.push({
                data: { source: edge.data.source, target: edge.data.target },
            });
        });

        return elements;
    };

    const createGraph = (data: ElementsDefinition) => {
        cy = cytoscape({
            container: document.getElementById('cy') as HTMLElement,
            elements: data,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': 'data(gradient)',
                        'label': 'data(label)',
                        'font-size': '10px',
                        'font-family': 'Onest-Regular',
                        'width': '30px',
                        'height': '30px',
                        'color': theme === LIGHT_THEME_KEY ? '#2D3748' : '#F9FAFB',                        'border-width': '0.5px',
                        'border-color': '#ccc',
                    }
                },
                {
                    selector: 'node.root',
                    style: {
                        'background-color': '#f3f24e'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'curve-style': 'unbundled-bezier',
                        'width': 1,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle'
                    }
                }
            ] as Stylesheet[],
            layout: {
                name: 'cose'
            }
        });

        // Add 'root' class to the root node
        const rootNode = cy.nodes().eq(0);
        rootNode.addClass('root');
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        console.log("Sending user input:", userInput);
        if (cy) {
            cy.destroy();
        }

        try {
            const response = await postData('http://localhost:8080/get_response_data', { user_input: userInput });
            console.log(response);
            setIsLoading(false);
            const graphData = await postData('http://localhost:8080/get_graph_data', {});
            const cytoData = parseResponseToElements(graphData);
            createGraph(cytoData);
        } catch (error) {
            setIsLoading(false);
            console.error('Fetch Error:', error);
        }
    };

    return (
        <div className={'dark:bg-[#1a1a1a]'}>
            <div className="flex w-full items-center justify-center  bg-black px-3">
                <a
                    className="relative mb-1 mt-1 text-base text-white transition-all hover:text-opacity-80"
                    href={`https://github.com/noahgsolomon/graphzila`}
                    target="_blank"
                    onMouseEnter={() => setHover(true)}
                    onMouseLeave={() => setHover(false)}
                >
                    ⭐ enjoying Graphzila? Leave a star{" "}
                    <span
                        className={`absolute -right-4 text-white transition-all ${
                            hover ? "-right-6 text-opacity-80" : ""
                        }`}
                    >
          →
        </span>
                </a>
            </div>
                <header
                className={`relative z-40 mx-5 mb-20 flex items-center py-5 font-bold transition-all`}
            >
            <div className="mx-auto flex w-full max-w-[50rem] flex-row flex-wrap items-center rounded-xl border-2 border-black px-4 py-3 shadow-custom transition-all dark:bg-[#1a1a1a] justify-between">
                <div className="cursor-pointer select-none flex flex-row px-1 text-4xl text-gray-800 hover:text-red-500 dark:hover:text-red-500 transition-all hover:-translate-y-0.5 dark:text-gray-50">
                    <img className={'w-[30px] mr-3'} src={'https://img.icons8.com/stickers/100/dragon.png'} alt={'graphzila'}/> Graphzila
                </div>
                <div
                    onClick={() => {
                        toggleTheme();
                        setTheme(
                            (localStorage.getItem(LOCALSTORAGE_THEME_KEY) as
                                | typeof LIGHT_THEME_KEY
                                | typeof DARK_THEME_KEY) || typeof LIGHT_THEME_KEY
                        );
                    }}
                >
                    {theme === LIGHT_THEME_KEY ? (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-5 w-5 cursor-pointer fill-yellow-500 transition-all hover:opacity-80"
                        >
                            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.844a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06 1.06l1.59-1.591a.75.75 0 00-1.061-1.06l-1.59 1.591z" />
                        </svg>
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-5 w-5 cursor-pointer fill-yellow-200 transition-all hover:opacity-80"
                        >
                            <path
                                fillRule="evenodd"
                                d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
                                clipRule="evenodd"
                            />
                        </svg>
                    )}
                </div>
            </div>
            </header>
            <div className="w-screen">
                <div className="dark:bg-[#1a1a1a] mt-10 p-4">
                    <form id="inputForm" className=" mb-4 text-center w-full" onSubmit={handleSubmit}>
                        <label htmlFor="userInput" className="mb-4 block font-bold text-lg">
                            Enter a string of text:
                        </label>
                        <div className="flex items-center md:mx-20 justify-center gap-5 md:flex">
                            <input
                                type="text"
                                id="userInput"
                                placeholder="Type here..."
                                className="flex-grow focus:border-red-500 dark:bg-[#0d0d0d] rounded-lg border-2 border-black px-5 py-2 font-bold transition-all focus:ring-0"
                                onChange={(e) => setUserInput(e.target.value)}
                                value={userInput}
                                required
                            />
                            <button
                                disabled={isLoading}
                                className={`border-black border-2 ${isLoading ? 'p-3' : 'p-1'} hover:border-black hover:shadow-custom hover:-translate-y-0.5 bg-red-500 hover:opacity-80 text-white rounded-lg transition-all`}
                            >{isLoading ? (<svg
                                className="mr-2 h-5 w-5 animate-spin"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>) : ('Submit 🔥')}</button>
                        </div>
                    </form>
                    {!isLoading ?
                        (
                            <div id="cy" className="h-screen dark:bg-[#0d0d0d] border-2 border-black md:mx-20  rounded-md shadow-custom"></div>
                        ) : (
                            <div className={'h-screen dark:bg-[#0d0d0d] z-10 border-2 border-black md:mx-20 rounded-md shadow-custom'}>
                                <div className="w-full h-full">
                                    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center justify-center">
                                        <div role="status">
                                            <svg
                                                className="mr-2 h-10 w-10 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-300"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="fire-stroke"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    strokeWidth="4"
                                                    fill={
                                                        localStorage.getItem(LOCALSTORAGE_THEME_KEY) === LIGHT_THEME_KEY
                                                            ? "white"
                                                            : "#1a1a1a"
                                                    }
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill={"white"}
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                        </div>
                                        <span className="text-center font-bold">Loading</span>
                                    </div>
                                </div>
                            </div>
                        )

                    }
                </div>
            </div>
        </div>

    );
}


