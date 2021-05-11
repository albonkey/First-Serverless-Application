import React, {useState, useEffect } from 'react';
import './App.css';
import { API, Auth, graphqlOperation } from 'aws-amplify';
import { withAuthenticator } from 'aws-amplify-react';
import { createNote, deleteNote, updateNote } from './graphql/mutations';
import { listNotes } from './graphql/queries';
import { onCreateNote, onDeleteNote, onUpdateNote } from './graphql/subscriptions';

function App() {
  const [id, setId ] = useState('');
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([]);

  const getUser = async () => {
    const user = await Auth.currentUserInfo();
    return user;
  };

  const hasExsistingNote = () => {
    if(id){
      const isNote = notes.findIndex(note => note.id === id) > -1;
      return isNote;
    }
    return false
  }

  const handleAddNote = async (e) => {
    e.preventDefault();

    if(hasExsistingNote()){
      handleUpdateNote()
    } else {
      const input = {
        note
      }
      await API.graphql(graphqlOperation(createNote, { input }))


    }



  };

  const handleUpdateNote = async () => {
    const input = {
      id,
      note
    }

    await API.graphql(graphqlOperation(updateNote, { input }))

  }

  const handleDeleteNote = async noteId => {
    const input = {  id: noteId }

    await API.graphql(graphqlOperation(deleteNote, {input}))
  }

  const handleChangeNote = ({note, id}) => {
    setNote(note);
    setId(id);
  }

  const getNotes = async () => {
    const result = await API.graphql(graphqlOperation(listNotes));
    setNotes(result.data.listNotes.items);
  }

  useEffect(() => {
    if(notes.length === 0){
      getNotes();
    }





    const createNoteListener = getUser().then(user => {
      return API.graphql(
        graphqlOperation(onCreateNote, { owner: user.username})
      ).subscribe({
        next: noteData => {
          const newNote = noteData.value.data.onCreateNote;
          setNotes(prevNotes => {
            const oldNotes = prevNotes.filter(note => note.id !== newNote.id)
            const updatedNotes = [...oldNotes, newNote]
            return updatedNotes
          })
          setNote('')
        }
      })
    })


    const deleteNoteListener = getUser().then(user => {
      return API.graphql(
        graphqlOperation(onDeleteNote, { owner: user.username})
      ).subscribe({
        next: noteData => {
          const deletedNote = noteData.value.data.onDeleteNote;
          setNotes(prevNotes => {
            const updatedNotes = prevNotes.filter(note => note.id !== deletedNote.id);
            return updatedNotes;
          });
        }
      })
    })

    const updateNoteListener =  getUser().then(user => {
      return API.graphql(
        graphqlOperation(onUpdateNote,  { owner: user.username})
      ).subscribe({
        next: noteData => {
          const updatedNote = noteData.value.data.onUpdateNote;

          setNotes(prevNotes => {
            const index = notes.findIndex(note => note.id === updatedNote.id)

            const updatedNotes = [
              ...notes.slice(0, index),
              updatedNote,
              ...notes.slice(index + 1)
            ];
            return updatedNotes;
          });
          setNote('');
          setId('')
        }
      })
    })

    return () => {
      createNoteListener.then(subscription => {
        subscription.unsubscribe()
      })

      deleteNoteListener.then(subscription => {
        subscription.unsubscribe()
      })
      updateNoteListener.then(subscription => {
        subscription.unsubscribe()
      })
    }

  },[notes])


  return (
    <div className="App">

      <h1> Amplify Notetaker</h1>
      <form onSubmit={handleAddNote}>
        <input type='text' placeholder='Write your note' onChange={(e) => setNote(e.target.value)} value={note} />
        <button type='submit'> {id ? 'Update Note' : 'Add Note'}</button>
      </form>
      <div className='note-list'>
        {
          notes.map(item => (
            <div key={item.id} className='note'>
              <li onClick={() => {
                handleChangeNote(item);
              }}>{item.note}</li>
              <button onClick={() => {handleDeleteNote(item.id)}}>
                <span>&times;</span>
              </button>
            </div>
          ))
        }
      </div>

    </div>
  );
}

export default withAuthenticator(App, { includeGreetings: true});
