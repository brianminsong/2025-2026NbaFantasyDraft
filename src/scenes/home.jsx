import React, { useEffect, useRef, useState } from 'react'
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, FormControl, Switch, TextField, Typography } from '@mui/material';
import * as XLSX from 'xlsx';
import  {playersList}  from '../sourceData/players';
import { GridToolbar } from '@mui/x-data-grid/internals';


export const Home = () => {
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [players, setPlayers] = useState(playersList);
    const [masterPlayers, setMasterPlayers] = useState(playersList);
    const [initialSet, setInitialSet] = useState(false);
    const [liveDraft, setLiveDraft] = useState([]);
    const [availableFiltered, setAvailableFiltered] = useState(false);
    const [myTeamFiltered, setMyTeamFiltered] = useState(false);
    const condensed = useRef(false);
    const initializeDefaultDataset = () => {
        let tempdataset = {
            maxPlayersPerTeam: 15,
            totalTeams: 12,
            draftPosition: 3,
            draftId: "",
        }
        // playerId: "1151627592760475648",
        return tempdataset;
    }
    const [dataset, setDataset] = useState(initializeDefaultDataset());
    //     const [checkList, setCheckList] = useState({
    //     type: 'include',
    //     ids: new Set(),
    // });

    useEffect(() => {
        if(!initialSet){
            setInitialSet(true);
            setSelectedColumns(columns);
        }

        //shits and giggles
        setLiveDraft([]);
    }, [initialSet]);


    const handleShowAllColumns = () => {
        setSelectedColumns(columns);
        condensed.current = false;
    }
    


    const calculateDraftPickNo = () => {
        // N pick = (totalTeams * 2) - (2 * N), and then (2 * N) - 1
        // or 24-2n and 2n-1
        let maxPicks = dataset.totalTeams * dataset.maxPlayersPerTeam;
        let count = dataset.draftPosition;
        let picks = [];
        let a = (dataset.totalTeams * 2) - (2 * dataset.draftPosition) + 1;
        let b = (2 * dataset.draftPosition) - 1;
        picks.push(dataset.draftPosition);
        while (count <= maxPicks){
            count += a;
            if(picks.length >= dataset.maxPlayersPerTeam){
                break;
            }
            picks.push(count);
            count += b;
            if(picks.length >= dataset.maxPlayersPerTeam){
                break;
            }
            picks.push(count);
        }
        return picks;
    }

    const handleDraftStatus = async () => {
        try {
            const response = await fetch(`https://api.sleeper.app/v1/draft/${dataset.draftId}/picks`);
            let data = await response.json();
            if(data.length < 0) {
                console.log("draft has not begun yet for this");
            }
            else{
                setLiveDraft(data);
            }
        }
        catch (error) {
            console.error("Error fetching draft status:", error);
        }
    };

    const handleHideStats = () => {
        let tempColumns = columns.slice(0, 3);
        tempColumns = tempColumns.concat(columns.slice(11, columns.length));
        setSelectedColumns(tempColumns);
        condensed.current = true;
    }

    const normalizeString = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    const handleAvailableFilter = (event) => {
        setAvailableFiltered(event.target.checked);
        if(event.target.checked){
            let filteredPlayers = masterPlayers.filter(player => player.pickedBy === "null");
            setPlayers(filteredPlayers);
            setMyTeamFiltered(false);
        }
        else{
            setPlayers(masterPlayers);
        }
    }

    const handleMyTeamFiltered = (event) => {
        setMyTeamFiltered(event.target.checked);
        if(event.target.checked){
            let filteredPlayers = masterPlayers.filter(player => calculateDraftPickNo().includes(player.pickNo));
            setPlayers(filteredPlayers);
        }
        else{
            handleAvailableFilter({target: {checked: availableFiltered}});
            //setPlayers(masterPlayers);
        }

    }


    const handleInputChange = (value, kind) => {
        const newDataset = { ...dataset };
        if(kind === "draftId"){
            newDataset.draftId = value;
        }
        // else if(kind === "playerId"){
        //     newDataset.playerId = value;
        // }
        else if(kind === "teamNo"){
            newDataset.totalTeams = parseInt(value);
        }
        else if(kind === "pickNo"){
            newDataset.draftPosition = parseInt(value);
        }
        setDataset(newDataset);
    }


    useEffect(() => {
        //update playersList with liveDraft info
        if(liveDraft.length > 0 && playersList.length > 0){
            let newPlayersList = [...playersList];
            liveDraft.forEach(pick => {
                let playerFirstName = normalizeString(pick.metadata["first_name"]);
                let playerLastName = normalizeString(pick.metadata["last_name"]);
                //console.log("looking for: " + playerFirstName + " " + playerLastName);
                const myListPlayerIndex = newPlayersList.findIndex(player => normalizeString(player["playerName"]).toLowerCase().includes(playerFirstName.toLowerCase()) && normalizeString(player["playerName"]).toLowerCase().includes(playerLastName.toLowerCase()));
                //console.log(newPlayersList[myListPlayerIndex]);
                if(myListPlayerIndex > -1){
                    newPlayersList[myListPlayerIndex]["pickNo"] = pick.pick_no;
                    newPlayersList[myListPlayerIndex]["roundPicked"] = pick.round;
                    newPlayersList[myListPlayerIndex]["pickNoInRound"] = pick.pick_no % dataset.totalTeams;
                    newPlayersList[myListPlayerIndex]["pickedBy"] = pick.picked_by;
                }
                else{
                    console.log("could not find player: " + playerFirstName + " " + playerLastName);
                }
            });
            setMasterPlayers(newPlayersList);
            if(availableFiltered){
                newPlayersList = newPlayersList.filter(player => player.pickedBy === "null");
            }
            if(myTeamFiltered){
                newPlayersList = newPlayersList.filter(player => calculateDraftPickNo().includes(player.pickNo));
            }
            setPlayers(newPlayersList);
        }
    }, [liveDraft]);

    const columns = [
        { field: 'playerName', headerName: 'Name', flex: 3, sortable: true  },
        { field: 'avgFantasyScore', headerName: 'Score', flex: 2, sortable: true, valueGetter: (params) => parseFloat(params)  },
        { field: "avgSingleGameHigh", headerName: "1High", flex: 2, sortable: true, valueGetter: (params) => parseFloat(params)   },
        { field: "avgTwoGameHigh", headerName: "2High", flex: 2, sortable: true, valueGetter: (params) => parseFloat(params)   },
        { field: "avgPTS", headerName: "PTS", flex: 2, sortable: true, valueGetter: (params) => parseFloat(params)   },
        { field: "avgTRB", headerName: "REB", flex: 2, sortable: true, valueGetter: (params) => parseFloat(params)   },
        { field: "avgAST", headerName: "AST", flex: 2, sortable: true, valueGetter: (params) => parseFloat(params)   },
        { field: "avgSTL", headerName: "STL", flex: 2, sortable: true, valueGetter: (params) => parseFloat(params)   },
        { field: "avgBLK", headerName: "BLK", flex: 2, sortable: true, valueGetter: (params) => parseFloat(params)   },
        { field: "avgFG3", headerName: "3PM", flex: 2, sortable: true, valueGetter: (params) => parseFloat(params)   },
        { field: "avgTOV", headerName: "TOV", flex: 2, sortable: true, valueGetter: (params) => parseFloat(params)   },
        { field: "MyRanking", headerName: "My", flex: 1.5, sortable: true, valueGetter: (params) => parseInt(params)   },
        { field: "Sleeper Rank" , headerName: "Sleep", flex: 1.5, sortable: true, valueGetter: (params) => parseInt(params)   },
        { field: "Discrepency", headerName: "Offset", flex: 1.5, sortable: true, valueGetter: (params) => parseInt(params)   },
        { field: "pickNo", headerName: "Pick#", flex: 1.5, sortable: true, valueGetter: (params) => parseInt(params),
            renderCell: (params) => isNaN(params.value) ? "" : params.value
        },
        { field: "roundPicked", headerName: "Round#", flex: 1.5, sortable: true, valueGetter: (params) => parseInt(params),
            renderCell: (params) => isNaN(params.value) ? "" : params.value
           },
        { field: "pickNoInRound", headerName: "P#inR#", flex: 1.5, sortable: true, valueGetter: (params) => parseInt(params),
            renderCell: (params) => isNaN(params.value) ? "" : params.value
           },
        
    ];
    // { field: "pickedBy", headerName: "By", flex: 3, sortable: true,
    //        renderCell: (params) => (calculateDraftPickNo().includes(params.row.pickNo)) ? "YOU" : ""  },
    // renderCell: (params) => (calculateDraftPickNo().includes(params.row.pickNo)) ? "YOU" : (params.value === "null" ? "" : params.value)  },
    // (params.value == dataset.playerId) || (calculateDraftPickNo().includes(params.row.pickNo))

  return (
    <Box border={1} width={"99vw"} margin={1} height={"100%"}>
        <Typography variant='h2'>Sleeper Fantasy Draft Tool</Typography>
        <Box display={"flex"} justifyContent={"space-between"} alignItems={"center"} margin={2} border={1}>
            <Box>
                <Box>
                    <TextField sx={{margin: 1, input: { color: 'white' }, label: {color: "lightblue"}, fieldset: { borderColor: "lightblue" }}} label="Draft ID" variant="outlined" size={'small'} onChange={(event) => handleInputChange(event.target.value, "draftId")}/>
                    <TextField sx={{margin: 1, input: { color: 'white' }, label: {color: "lightblue"}, fieldset: { borderColor: "lightblue" }}} label="# of teams" variant="outlined" size={'small'} onChange={(event) => handleInputChange(event.target.value, "teamNo")}/>
                    <TextField sx={{margin: 1, input: { color: 'white' }, label: {color: "lightblue"}, fieldset: { borderColor: "lightblue" }}} label="Pick #" variant="outlined" size={'small'} onChange={(event) => handleInputChange(event.target.value, "pickNo")}/>
                </Box>
                <Box>
                    <Button sx={{marginLeft: 0.5, marginRight: 0.5}} variant='contained' onClick={() => {
                        handleShowAllColumns();
                    }}>Show all cols</Button>
                    <Button sx={{marginLeft: 0.5, marginRight: 0.5}} variant='contained' onClick={() => {
                        handleHideStats();
                    }}>Hide stats</Button>
                    <Button sx={{marginLeft: 0.5, marginRight: 0.5}} variant='contained' onClick={() => {
                        handleDraftStatus();
                    }}>Get Draft Status</Button>
                    <Switch checked={availableFiltered} onChange={(event) => {handleAvailableFilter(event)}} />
                    <Typography variant='caption'>Show available</Typography>
                    <Switch checked={myTeamFiltered} onChange={(event) => {handleMyTeamFiltered(event)}} />
                    <Typography variant='caption'>Show your players</Typography>
                </Box>
            </Box>
            <Box>
                <Typography>You are pick #{dataset.draftPosition} in the draft out of {dataset.totalTeams} teams</Typography>
                <Typography>Current pick {(liveDraft.length % dataset.totalTeams) + 1} in the {Math.floor(liveDraft.length / dataset.totalTeams) + 1} round. (#{liveDraft.length + 1} pick overall)</Typography>
                <Typography>Your picks are {calculateDraftPickNo().join(', ')}</Typography>
            </Box>
        </Box>
        <Box width={condensed.current == true ? "60%" : "98%"} height={"85vh"} marginLeft={2} marginRight={2}>
            <DataGrid
                rows={players.map((player) => ({ id: player.playerName, ...player }))}
                //rows={players}
                //getRowId={(row) => row.playerName}
                columns={selectedColumns}
                slots={{ toolbar: GridToolbar }}
                isRowSelectable={(params) => params.row.pickedBy == "null"}
                checkboxSelection
                //showToolbar
                rowHeight={30}
                //onRowSelectionModelChange={(event) => setCheckList(event)}
                //rowSelectionModel={checkList}
                sx={{
                    ".me": {
                        bgcolor: "gold",
                        "&:hover": {
                            bgcolor: "gold",
                    }},
                    ".blank": {
                        bgcolor: "white",
                        "&:hover": {
                            bgcolor: "white",
                    }},
                    ".else": {
                        bgcolor: "grey",
                        "&:hover": {
                            bgcolor: "grey",
                    }},
                }}
                getRowClassName={(params) =>{
                        return (calculateDraftPickNo().includes(params.row.pickNo)) ? "me" : (params.row.pickedBy === "null" ? "blank" : "else");}
                }
                />

        </Box>
    </Box>
  )
}
