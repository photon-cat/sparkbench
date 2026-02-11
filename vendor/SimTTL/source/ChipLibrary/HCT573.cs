// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT573.
    /// </summary>
    public class HCT573 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/sn74hct573.pdf

        private const double TYP_PROPAGATION_DELAY = 21;

        #region Private/Protected Fields
        protected Pin FF1;
        protected Pin FF2;
        protected Pin FF3;
        protected Pin FF4;
        protected Pin FF5;
        protected Pin FF6;
        protected Pin FF7;
        protected Pin FF8;
        protected SignalState lastLE;
        protected SignalState lastOEn;
        protected Pin[] FFs;
        #endregion Private/Protected Fields

        #region Input Pins
        public Pin LE;
        public Pin OEn;

        public Pin I1D;
        public Pin I2D;
        public Pin I3D;
        public Pin I4D;
        public Pin I5D;
        public Pin I6D;
        public Pin I7D;
        public Pin I8D;
        #endregion Input Pins

        #region Output Pins
        public Pin O1Q;
        public Pin O2Q;
        public Pin O3Q;
        public Pin O4Q;
        public Pin O5Q;
        public Pin O6Q;
        public Pin O7Q;
        public Pin O8Q;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT573(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT573(string Name, Net NetLE, Net NetOEn, Net NetD1, Net NetD2, Net NetD3, Net NetD4, Net NetD5, Net NetD6, Net NetD7, Net NetD8) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "20");
            this.Ground[0] = new Pin(this, "GND", "10");

            this.LE = new Pin(this, "LE", "11", LineMode.In, SignalState.L, NetOEn);
            this.OEn = new Pin(this, "OEn", "1", LineMode.In, SignalState.L, NetOEn);

            this.I1D = new Pin(this, "1D", "2", LineMode.In, SignalState.L, NetD1);
            this.I2D = new Pin(this, "2D", "3", LineMode.In, SignalState.L, NetD2);
            this.I3D = new Pin(this, "3D", "4", LineMode.In, SignalState.L, NetD3);
            this.I4D = new Pin(this, "4D", "5", LineMode.In, SignalState.L, NetD4);
            this.I5D = new Pin(this, "5D", "6", LineMode.In, SignalState.L, NetD5);
            this.I6D = new Pin(this, "6D", "7", LineMode.In, SignalState.L, NetD6);
            this.I7D = new Pin(this, "7D", "8", LineMode.In, SignalState.L, NetD7);
            this.I8D = new Pin(this, "8D", "9", LineMode.In, SignalState.L, NetD8);

            this.FF1 = new Pin(this, "FF1", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF2 = new Pin(this, "FF2", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF3 = new Pin(this, "FF3", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF4 = new Pin(this, "FF4", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF5 = new Pin(this, "FF5", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF6 = new Pin(this, "FF6", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF7 = new Pin(this, "FF7", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF8 = new Pin(this, "FF8", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            FFs = new Pin[] { this.FF1, this.FF2, this.FF3, this.FF4, this.FF5, this.FF6, this.FF7, this.FF8 };

            this.O1Q = new Pin(this, "1Q", "19", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O2Q = new Pin(this, "2Q", "18", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O3Q = new Pin(this, "3Q", "17", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O4Q = new Pin(this, "4Q", "16", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O5Q = new Pin(this, "5Q", "15", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O6Q = new Pin(this, "6Q", "14", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O7Q = new Pin(this, "7Q", "13", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O8Q = new Pin(this, "8Q", "12", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[3][];
            SetPinArray(Inputs, 0, this.LE);
            SetPinArray(Inputs, 1, this.OEn);
            SetPinArray(Inputs, 2, new Pin[] { this.I1D, this.I2D, this.I3D, this.I4D, this.I5D, this.I6D, this.I7D, this.I8D });

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, new Pin[] { this.O1Q, this.O2Q, this.O3Q, this.O4Q, this.O5Q, this.O6Q, this.O7Q, this.O8Q });

            lastLE = this.LE.State;
            lastOEn = this.OEn.State;
        }
        #endregion Constructors

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);

            if (LE.State == SignalState.H)
            {
                for (int i = 0; i < Inputs[2].Length; i++)
                    FFs[i].SetOutState(Inputs[2][i].State);
            }

            if (OEn.State == SignalState.L)
            {
                for (int i = 0; i < Inputs[2].Length; i++)
                    if (Outputs[0][i].NewOutState != FFs[i].State)
                        Outputs[0][i].NewOutState = FFs[i].State;
            }
            else if (lastOEn == SignalState.L)
            {
                for (int i = 0; i < Outputs[0].Length; i++)
                    Outputs[0][i].NewOutState = SignalState.Z;

                lastOEn = SignalState.H;
            }
        }
        #endregion Public Methods
    }
}

