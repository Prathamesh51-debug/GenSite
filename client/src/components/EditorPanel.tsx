import { X } from 'lucide-react';
import  { useEffect, useState } from 'react'


interface EditorPanelProps {
    selectedElement: {
        tagName: string;
        className: string;
        text: string;
        styles: {
            padding: string;
            margin: string;
            backgroundColor: string;
            color: string;
            fontSize: string;
        };
        outerHTML?: string;
    } | null;
    onUpdate: (Updates: any)=> void;
    onClose: ()=> void;
    onAiEdit: (prompt: string)=> void;
    aiLoading: boolean;
}

const EditorPanel = ({selectedElement, onUpdate, onClose, onAiEdit, aiLoading}: EditorPanelProps) => {

  const [values, setValues] = useState(selectedElement)
  const [aiPrompt, setAiPrompt] = useState('')

  useEffect(()=>{
    setValues(selectedElement)
  },[selectedElement])

  if(!selectedElement || !values) return null;

  const handleChange =(field: string,value: string)=>{
    const newValues ={...values, [field]: value};
    if(field in values.styles){
        newValues.styles = {...values.styles, [field]: value}
    }
    setValues(newValues)
    onUpdate({[field]: value});
  }

  const handleStyleChange = (styleName: string,value: string)=>{
    const newStyles = {...values.styles,[styleName]: value};
    setValues({...values,styles: newStyles});
    onUpdate({styles: {[styleName]: value}})
  }
  
    return (
    <div className='absolute top-4 right-4 w-80 bg-white rounded-lg shadow-xl
    border border-gray-200 p-4 z-50 animate-fade-in fade-in '>
        <div className='flex justify-between items-center mb-4'>
            <h3 className='font-semibold text-gray-800'>Edit Element</h3>
            <button onClick={onClose} aria-label='Close editor' className='p-1 hover:bg-gray-100 rounded-full'>
                <X className='w-4 h-4 text-gray-500'/>
            </button>
        </div>
        {}
        <div className='mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3'>
            <label className='block text-xs font-semibold text-indigo-700 mb-1.5'>
                Ask AI to change this section
            </label>
            <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder='e.g. make this a dark card with a gradient button and an icon'
                disabled={aiLoading}
                className='w-full text-sm p-2 border border-indigo-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none min-h-16 bg-white text-gray-800 disabled:opacity-60'
            />
            <button
                type='button'
                onClick={() => { if (aiPrompt.trim()) onAiEdit(aiPrompt.trim()); }}
                disabled={aiLoading || !aiPrompt.trim()}
                className='mt-2 w-full flex items-center justify-center gap-2 rounded-md bg-indigo-600 text-white text-sm font-medium py-2 hover:bg-indigo-500 disabled:opacity-60 transition-colors'
            >
                {aiLoading ? 'Applying…' : 'Apply with AI'}
            </button>
            <p className='mt-1.5 text-[11px] text-indigo-600/80'>Edits only this section · 2 credits</p>
        </div>

        <div className='space-y-4 text-black'>
            <div>
                <label className='block text-xs font-medium text-gray-500 mb-1'>
                    Text Content
                </label>
                <textarea value={values.text} onChange={(e)=>handleChange('text',e.target.value)} 
                    className='w-full text-sm p-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none min-h-20'/>

            </div>
            <div>
                <label className='block text-xs font-medium text-gray-500 mb-1'>
                    Class Name
                </label>
                <input type='text' value={values.className || ''} onChange={(e)=>handleChange('className',e.target.value)} 
                    className='w-full text-sm p-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none '/>
            </div>
            <div className='grid grid-cols-2 gap-3'>
                <div>
                    <label className='block text-xs font-medium text-gray-500
                    mb-1'>Padding</label>
                    <input type='text' 
                    value={values.styles.padding } 
                    onChange={(e)=>handleStyleChange('padding',e.target.value)} 
                    className='w-full text-sm p-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none '/>

                </div>
                <div>
                    <label className='block text-xs font-medium text-gray-500
                    mb-1'>Margin</label>
                    <input type='text' 
                    value={values.styles.margin } 
                    onChange={(e)=>handleStyleChange('margin',e.target.value)} 
                    className='w-full text-sm p-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none '/>

                </div>

            </div>
            <div className='grid grid-cols-2 gap-3'>
            <div>
                    <label className='block text-xs font-medium text-gray-500
                    mb-1'>Font Size</label>
                    <input type='text' 
                    value={values.styles.fontSize } 
                    onChange={(e)=>handleStyleChange('fontSize',e.target.value)} 
                    className='w-full text-sm p-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none '/>
                </div>

            </div>
            <div className='grid grid-cols-2 gap-3'>
            <div>
                    <label className='block text-xs font-medium text-gray-500
                    mb-1'>Background</label>
                    <div className='flex items-center gap-2 border border-gray-400
                    rounded-md p-1'>
                    <input type='color' 
                    value={values.styles.backgroundColor ==='rgba(0, 0, 0, 0)' ?
                        '#ffffff' : values.styles.backgroundColor
                    } 
                    onChange={(e)=>handleStyleChange('backgroundColor',e.target.value)} 
                    className='w-6 h-6 cursor-pointer '/>
                    <span className='text-xs text-gray-600 truncate'>{values.styles.backgroundColor}</span>
                    </div>
                    
                </div>
                <div>
                    <label className='block text-xs font-medium text-gray-500
                    mb-1'>Text Color</label>
                    <div className='flex items-center gap-2 border border-gray-400
                    rounded-md p-1'>
                    <input type='color' 
                    value={values.styles.color  } 
                    onChange={(e)=>handleStyleChange('color',e.target.value)} 
                    className='w-6 h-6 cursor-pointer '/>
                    <span className='text-xs text-gray-600 truncate'>
                        {values.styles.color}</span>
                    </div>
                    
                </div>


            </div>
        </div>
    </div>
  )
}

export default EditorPanel