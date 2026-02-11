// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SimTTL
{
    /// <summary>
    /// A class to represent a vertical marker line at a specific time. 
    /// </summary>
    public class Marker
    {
        /// <summary>X-coordinate of the vertical line on the signal graph bitmap.</summary>
        public int X;
        /// <summary>Y-coordinate from the mouse.</summary>
        public int Y;
        /// <summary>Time value corresponding to the X-coordinate.</summary>
        public double Time;
        /// <summary>True, if the marker is currently beeing moved.</summary>
        public bool Moving;
        /// <summary>True, if the marker is selected.</summary>
        public bool Selected;

        /// <summary>
        /// Creates the Marker instance.
        /// </summary>
        public Marker() 
        {
            X = -1;
            Y = -1;
            Time = -1;
            Moving = false;
            Selected = false;
        }
        
    }
}
